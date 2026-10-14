import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import * as format from "../src/lib/utils/format.ts";
import { bookingOccurrences } from "../../../server/src/services/bookingScheduleService.js";

const context = vm.createContext({ console });
const source = await readFile(new URL("../src/lib/utils/reservations.ts", import.meta.url), "utf8");
const module = new vm.SourceTextModule(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
} }).outputText, { context });
await module.link(() => new vm.SyntheticModule(Object.keys(format), function () {
  for (const [key, value] of Object.entries(format)) this.setExport(key, value);
}, { context }));
await module.evaluate();
const { repeatBookingPreview, fieldDayRange, occupiedSlotLabels } = module.namespace;

test("recurring price preview agrees with the server across weekly DST and short monthly dates", () => {
  for (const [date, start, end, zone, repeat] of [
    ["2027-03-07", "18:30", "19:00", "America/Indiana/Indianapolis", { frequency: "weekly", until: "2027-03-21" }],
    ["2099-01-31", "18:00", "19:00", "UTC", { frequency: "monthly", until: "2099-05-31" }],
    ["2027-03-07", "00:30", "03:30", "America/Indiana/Indianapolis", { frequency: "weekly", until: "2027-03-21" }],
  ]) {
    const slots = bookingOccurrences({ metadata: { timeZone: zone } }, format.combineDateAndTime(date, start, zone), format.combineDateAndTime(date, end, zone), repeat);
    const preview = repeatBookingPreview(date, start, end, zone, 100, repeat);
    assert.equal(preview.error, "");
    assert.equal(preview.count, slots.length);
    assert.equal(preview.total, slots.reduce((sum, slot) => sum + (slot.endTime - slot.startTime) / 3600000 * 100, 0));
  }
});

test("availability converts UTC reservations to local labels and clips to the selected field day", () => {
  const range = fieldDayRange("2027-03-07", "06:00", "23:00", "America/Indiana/Indianapolis");
  const result = occupiedSlotLabels([
    { startTime: "2027-03-07T23:30Z", endTime: "2027-03-08T00:00Z" },
    { startTime: "2027-03-14T22:30Z", endTime: "2027-03-14T23:00Z" },
  ], "2027-03-07", range, "America/Indiana/Indianapolis");
  assert.equal(result.length, 1);
  assert.equal(result[0].startTime, "18:30");
  assert.equal(result[0].endTime, "19:00");
});

test("overnight and full-day occupied labels remain blocked past midnight", () => {
  const overnight = fieldDayRange("2099-01-01", "18:00", "03:00", "UTC");
  const slots = occupiedSlotLabels([{ startTime: "2099-01-01T23:30Z", endTime: "2099-01-02T00:30Z" }], "2099-01-01", overnight, "UTC");
  assert.equal(slots[0].startTime, "23:30");
  assert.equal(slots[0].endTime, "24:30");
  const allDay = fieldDayRange("2099-01-01", "00:00", "00:00", "UTC");
  assert.equal(occupiedSlotLabels([allDay], "2099-01-01", allDay, "UTC")[0].endTime, "24:00");
});
