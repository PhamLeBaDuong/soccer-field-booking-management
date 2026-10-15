import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "../db.cjs";

export const PHOTO_DIRECTORY = resolve(process.env.PHOTO_DIRECTORY || fileURLToPath(new URL("../../uploads", import.meta.url)));
export const PHOTO_LIMIT = 12;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;
const prefix = "/api/fields/images/";
const failure = (message, status = 400) => Object.assign(new Error(message), { status });

export function imageExtension(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > PHOTO_MAX_BYTES) throw failure("Choose an image up to 5 MB.");
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  throw failure("Choose a JPEG, PNG, or WebP image.");
}

export function createPhotoService(db = prisma, directory = PHOTO_DIRECTORY) {
  async function change(kind, id, userId, edit) {
    if (!["complexes", "fields"].includes(kind)) throw failure("Invalid photo target.");
    return db.$transaction(async tx => {
      if (kind === "complexes") await tx.$queryRaw`SELECT id FROM "Complex" WHERE id = ${id} FOR UPDATE`;
      else await tx.$queryRaw`SELECT id FROM "Field" WHERE id = ${id} FOR UPDATE`;
      const model = kind === "complexes" ? tx.complex : tx.field;
      const resource = await model.findUnique({ where: { id }, ...(kind === "fields" && { include: { complex: { select: { ownerId: true } } } }) });
      if (!resource) throw failure("Venue or field not found.", 404);
      if (resource.ownerId !== userId && resource.complex?.ownerId !== userId) throw failure("Forbidden", 403);
      const images = Array.isArray(resource.metadata?.images) ? resource.metadata.images : [];
      const updated = edit(images);
      await model.update({ where: { id }, data: { metadata: { ...resource.metadata, images: updated } } });
      return updated;
    });
  }
  return {
    async upload(kind, id, userId, bytes) {
      const extension = imageExtension(bytes);
      const name = `${randomUUID()}.${extension}`;
      const path = resolve(directory, name);
      await mkdir(directory, { recursive: true });
      await writeFile(path, bytes, { flag: "wx" });
      try {
        return await change(kind, id, userId, images => {
          if (images.length >= PHOTO_LIMIT) throw failure(`Keep at most ${PHOTO_LIMIT} photos.`);
          return [...images, `${prefix}${name}`];
        });
      } catch (error) { await unlink(path).catch(() => {}); throw error; }
    },
    async reorder(kind, id, userId, order) {
      return change(kind, id, userId, images => {
        if (!Array.isArray(order) || order.length !== images.length || new Set(order).size !== images.length || order.some(url => !images.includes(url))) {
          throw failure("Invalid photo order.");
        }
        return order;
      });
    },
    async remove(kind, id, userId, name) {
      if (!PHOTO_NAME.test(name)) throw failure("Invalid photo.");
      const images = await change(kind, id, userId, images => {
        if (!images.includes(`${prefix}${name}`)) throw failure("Photo not found.", 404);
        return images.filter(url => url !== `${prefix}${name}`);
      });
      // Metadata is authoritative; an orphaned file can be cleaned up later if storage is unavailable.
      await unlink(resolve(directory, name)).catch(error => { if (error.code !== "ENOENT") console.error("Photo cleanup failed", error); });
      return images;
    },
  };
}

export const photos = createPhotoService();
