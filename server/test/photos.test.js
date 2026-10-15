import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPhotoService, imageExtension } from "../src/services/photoService.js";
import vm from "node:vm";
import express from "express";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64");

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "pitchbook-photo-test-"));
  t.after(async () => { for (const file of await readdir(directory)) await unlink(join(directory, file)); await rmdir(directory); });
  const rows = {
    complexes: { id: "complex", ownerId: "owner", metadata: { timeZone: "Asia/Ho_Chi_Minh", existing: "preserved" } },
    fields: { id: "field", ownerId: "owner", metadata: { currency: "VND" } },
  };
  let queue = Promise.resolve();
  const db = { $queryRaw: async () => [] };
  for (const [kind, model] of [["complexes", "complex"], ["fields", "field"]]) db[model] = {
    findUnique: async ({ where }) => where.id === rows[kind].id ? structuredClone(rows[kind]) : null,
    update: async ({ data }) => {
      assert.deepEqual(Object.keys(data), ["metadata"]);
      Object.assign(rows[kind], structuredClone(data)); return rows[kind];
    },
  };
  db.$transaction = action => {
    const result = queue.then(() => action(db)); queue = result.catch(() => {}); return result;
  };
  return { photos: createPhotoService(db, directory), directory, rows, db };
}

test("owners upload complex and field photos, select a cover, and remove files while preserving existing metadata", async t => {
  const { photos, directory, rows } = await fixture(t);
  const first = await photos.upload("complexes", "complex", "owner", png);
  const second = await photos.upload("complexes", "complex", "owner", png);
  assert.equal(second[0], first[0]);
  assert.deepEqual(await readFile(join(directory, first[0].split("/").pop())), png);
  assert.deepEqual(await photos.reorder("complexes", "complex", "owner", [second[1], second[0]]), [second[1], second[0]]);
  assert.equal(rows.complexes.metadata.timeZone, "Asia/Ho_Chi_Minh");
  assert.equal(rows.complexes.metadata.existing, "preserved");
  await photos.upload("fields", "field", "owner", png);
  assert.equal(rows.fields.metadata.currency, "VND");
  assert.deepEqual(await photos.remove("complexes", "complex", "owner", first[0].split("/").pop()), [second[1]]);
  assert.equal((await readdir(directory)).length, 2);
});

test("other users cannot upload, reorder, or delete photos and failed writes leave no file behind", async t => {
  const { photos, directory } = await fixture(t);
  const images = await photos.upload("fields", "field", "owner", png);
  const before = await readdir(directory);
  await assert.rejects(photos.upload("fields", "field", "stranger", png), { status: 403 });
  await assert.rejects(photos.reorder("fields", "field", "stranger", images), { status: 403 });
  await assert.rejects(photos.remove("fields", "field", "stranger", images[0].split("/").pop()), { status: 403 });
  await assert.rejects(photos.upload("fields", "missing", "owner", png), { status: 404 });
  assert.deepEqual(await readdir(directory), before);
});

test("photo validation rejects non-images, oversized uploads, injected URLs and invalid paths", async t => {
  const { photos } = await fixture(t);
  assert.equal(imageExtension(png), "png");
  assert.throws(() => imageExtension(Buffer.from("<svg onload='alert(1)'></svg>")), /JPEG/);
  assert.throws(() => imageExtension(Buffer.alloc(5 * 1024 * 1024 + 1)), /5 MB/);
  const images = await photos.upload("complexes", "complex", "owner", png);
  await assert.rejects(photos.reorder("complexes", "complex", "owner", ["https://example.com/photo.jpg"]), /Invalid photo order/);
  await assert.rejects(photos.remove("complexes", "complex", "owner", "../../file"), /Invalid photo/);
  assert.equal(images.length, 1);
});

test("complex owners manage photos for fields created without a separate field owner", async t => {
  const { photos, rows } = await fixture(t);
  rows.fields.ownerId = null;
  rows.fields.complex = { ownerId: "owner" };
  const images = await photos.upload("fields", "field", "owner", png);
  assert.equal(images.length, 1);
  await assert.rejects(photos.upload("fields", "field", "stranger", png), { status: 403 });
});

test("a failed database save removes the newly uploaded file", async t => {
  const { photos, directory, db } = await fixture(t);
  db.field.update = async () => { throw new Error("Database unavailable"); };
  await assert.rejects(photos.upload("fields", "field", "owner", png), /Database unavailable/);
  assert.equal((await readdir(directory)).length, 0);
});

test("simultaneous photo uploads preserve each other and enforce the per-venue limit", async t => {
  const { photos, directory, rows } = await fixture(t);
  await Promise.all(Array.from({ length: 11 }, () => photos.upload("complexes", "complex", "owner", png)));
  assert.equal(rows.complexes.metadata.images.length, 11);
  const results = await Promise.allSettled([photos.upload("complexes", "complex", "owner", png), photos.upload("complexes", "complex", "owner", png)]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(rows.complexes.metadata.images.length, 12);
  assert.equal((await readdir(directory)).length, 12);
});

async function loadModule(path, dependencies) {
  const context = vm.createContext({ console });
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const module = new vm.SourceTextModule(source, { context });
  await module.link(name => {
    const exports = dependencies[name];
    assert.ok(exports, `Unexpected dependency ${name}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate(); return module.namespace;
}

test("admin price and venue edits preserve uploaded photo metadata", async () => {
  let fieldData;
  let reads = 0;
  const db = {
    $queryRaw: async () => [],
    field: { update: async ({ data }) => { fieldData = data; return data; } },
    complex: {
      findUnique: async () => ({ id: "complex", lat: 10.7, lng: 106.7,
        metadata: { timeZone: "Asia/Ho_Chi_Minh", images: ++reads === 1 ? [] : ["new-photo"] } }),
      update: async ({ data }) => data,
    },
  };
  db.$transaction = action => action(db);
  const controller = await loadModule("../src/controllers/adminController.js", {
    "../services/reservationService.js": { groupReservations: () => [] }, "../db.cjs": { default: db },
    "../services/venueTimeZoneService.js": { coordinatesTimeZone: () => "Asia/Ho_Chi_Minh", withVenueTimeZone: value => value, withFieldTimeZone: value => value },
    dotenv: { default: { config() {} } },
  });
  let body, status;
  const res = { status(value) { status = value; return this; }, json(value) { body = value; } };
  await controller.updateField({ params: { id: "field" }, body: { price: 200 } }, res);
  assert.equal(status, 200);
  assert.equal(fieldData.pricePerHour, 200);
  assert.ok(!Object.hasOwn(fieldData, "metadata"));
  await controller.updateComplex({ params: { id: "complex" }, body: { name: "Updated venue" } }, res);
  assert.equal(status, 200);
  assert.equal(body.complex.metadata.images[0], "new-photo");
});

test("actual photo routes accept binary uploads, expose images publicly, and return readable API errors", async t => {
  const { photos, directory } = await fixture(t);
  const { PHOTO_NAME } = await import("../src/services/photoService.js");
  const controller = await loadModule("../src/controllers/photoController.js", {
    "../services/photoService.js": { photos, PHOTO_DIRECTORY: directory, PHOTO_NAME },
    "node:path": { resolve: (...parts) => join(...parts) },
  });
  const authenticate = (req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ error: "Unauthorized" });
    req.user = { id: req.headers.authorization }; next();
  };
  const unused = () => { throw new Error("Unrelated endpoint called"); };
  const venueControllers = Object.fromEntries([
    "getMyComplexes", "getMyComplex", "createComplex", "updateComplex", "deleteComplex", "getFieldsForComplex",
    "createField", "updateField", "deleteField", "getVenueFieldSchedule", "getComplexSchedule", "createManualBooking",
  ].map(name => [name, unused]));
  const routes = await loadModule("../src/routes/venueRoute.js", {
    express: { Router: express.Router, raw: express.raw },
    "../middleware/authMiddleware.js": { authenticate }, "../controllers/photoController.js": controller,
    "../controllers/venueController.js": venueControllers,
  });
  const fields = await loadModule("../src/routes/fieldRoute.js", {
    express: { default: express }, "../middleware/authMiddleware.js": { authenticate },
    "../controllers/fieldController.js": { getAllFields: unused, getNearbyFields: unused, getFieldById: unused },
    "../controllers/photoController.js": controller,
  });
  const app = express(); app.use(express.json());
  app.use("/api/venues", routes.default); app.use("/api/fields", fields.default);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const path = "/api/venues/complexes/complex/photos";
  assert.equal((await fetch(base + path, { method: "POST", headers: { "Content-Type": "image/png" }, body: png })).status, 401);
  const upload = await fetch(base + path, { method: "POST", headers: { Authorization: "owner", "Content-Type": "image/png" }, body: png });
  assert.equal(upload.status, 201);
  const { images } = await upload.json();
  const image = await fetch(base + images[0]);
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-type"), /image\/png/);
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
  const tooLarge = await fetch(base + path, { method: "POST", headers: { Authorization: "owner", "Content-Type": "image/png" }, body: Buffer.alloc(5 * 1024 * 1024 + 1) });
  assert.equal(tooLarge.status, 413);
  assert.match((await tooLarge.json()).error, /5 MB/);
  const removed = await fetch(base + path + "/" + images[0].split("/").pop(), { method: "DELETE", headers: { Authorization: "owner" } });
  assert.equal(removed.status, 200);
  assert.equal((await fetch(base + images[0])).status, 404);
});
