import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as constants from "../src/lib/constants.ts";
import * as format from "../src/lib/utils/format.ts";

async function load(path, dependencies = {}) {
  const context = vm.createContext({ console });
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const module = new vm.SourceTextModule(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText, { context });
  await module.link(name => {
    const exports = dependencies[name];
    assert.ok(exports, `Unexpected dependency ${name}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate(); return module.namespace;
}

const normalizers = await load("../src/lib/api/normalizers.ts", {
  "@/lib/constants": constants, "@/lib/utils/format": format,
});
const grouping = await load("../src/lib/utils/complexes.ts");
const cover = "/api/fields/images/12345678-1234-1234-1234-123456789012.png";
const fieldPhoto = "/api/fields/images/87654321-1234-1234-1234-123456789012.png";
const fields = ["one", "two"].map((id, index) => normalizers.normalizeField({
  id, complexId: "venue", name: `Field ${id}`, type: index ? "7v7" : "5v5", pricePerHour: (index + 1) * 100,
  startTime: "2000-01-01T06:00Z", endTime: "2000-01-01T22:00Z", metadata: { images: [fieldPhoto] },
  complex: { id: "venue", name: "Central Venue", metadata: { timeZone: "Asia/Ho_Chi_Minh", images: [cover] } },
}));

test("fields group into one complex and retain independent prices, photos, and venue timezone", () => {
  const groups = grouping.groupFieldsByComplex(fields);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].fields.length, 2);
  assert.equal(groups[0].complex.images[0], cover);
  assert.equal(groups[0].fields[1].metadata.price, 200);
  assert.equal(groups[0].fields[1].metadata.timeZone, "Asia/Ho_Chi_Minh");
  assert.equal(groups[0].fields[0].images[0], fieldPhoto);
  assert.equal(normalizers.normalizeComplex({ metadata: { images: ["javascript:alert(1)"] } }).images.length, 0);
  assert.equal(normalizers.normalizeField({}).images.length, 0);
});

const plain = ({ children }) => React.createElement("div", null, children);
const link = ({ children, href, ...props }) => React.createElement("a", { href, ...props }, children);
const icon = () => null;
let selection = "";
const detail = await load("../src/components/fields/ComplexDetail.tsx", {
  "react/jsx-runtime": jsx, react: { useState: () => [selection, () => {}] },
  "next/link": { default: link },
  "lucide-react": { ArrowLeft: icon, Clock: icon, CloudSun: icon, MapPin: icon, Trophy: icon, Zap: icon },
  "@/components/fields/AmenitiesList": { AmenitiesList: plain },
  "@/components/fields/FieldMap": { FieldMap: plain },
  "@/components/bookings/BookingForm": { BookingForm: ({ field }) => React.createElement("div", {
    "data-booking-field": field.id, "data-price": field.metadata.price, "data-zone": field.metadata.timeZone,
  }) },
  "@/components/ui/Card": { Card: plain, CardContent: plain },
  "@/components/ui/ErrorState": { ErrorState: ({ message }) => message },
  "@/components/ui/Skeleton": { Skeleton: plain }, "@/lib/constants": constants,
  "@/components/ui/Button": { buttonClasses: () => "button" },
  "@/lib/utils/format": format, "@/hooks/useFields": { useFields: () => ({ fields, loading: false }) },
  "./PhotoGallery": { PhotoGallery: ({ images }) => React.createElement("div", { "data-photos": images.join(",") }) },
});

test("complex booking requires a field choice and uses the selected field's form and gallery", () => {
  selection = "";
  const initial = renderToStaticMarkup(React.createElement(detail.ComplexDetail, { complexId: "venue" }));
  assert.match(initial, /Choose a field/);
  assert.match(initial, /Field one/);
  assert.match(initial, /Field two/);
  assert.doesNotMatch(initial, /data-booking-field/);
  for (const [id, price] of [["one", 100], ["two", 200]]) {
    selection = id;
    const html = renderToStaticMarkup(React.createElement(detail.ComplexDetail, { complexId: "venue" }));
    assert.match(html, new RegExp(`data-booking-field="${id}" data-price="${price}" data-zone="Asia/Ho_Chi_Minh"`));
    assert.ok(html.includes(fieldPhoto));
  }
});

test("complex card uses the first complex image and links to complex booking", async () => {
  const card = await load("../src/components/fields/ComplexCard.tsx", {
    "react/jsx-runtime": jsx, "next/link": { default: link }, "lucide-react": { ArrowRight: icon, MapPin: icon },
    "@/components/ui/Button": { buttonClasses: () => "button" }, "@/lib/utils/format": format,
    "@/lib/api/photos": { photoUrl: path => `https://api.test${path}` },
  });
  const html = renderToStaticMarkup(React.createElement(card.ComplexCard, { fields }));
  assert.ok(html.includes(`https://api.test${cover}`));
  assert.ok(!html.includes(fieldPhoto));
  assert.match(html, /href="\/complexes\/venue"/);
  assert.match(html, /2 fields/);
});
