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
const { repeatBookingPreview, fieldDayRange, occupiedSlotLabels, timetableSlots } = module.namespace;

test("owner timetable offers future empty half-hours in venue time and excludes every overlapping booking", () => {
  const zone = "America/Indiana/Indianapolis", date = "2099-10-14";
  const bookings = [
    { startTime: format.combineDateAndTime(date, "18:45", zone), endTime: format.combineDateAndTime(date, "19:15", zone) },
    { startTime: format.combineDateAndTime(date, "20:00", zone), endTime: format.combineDateAndTime(date, "20:30", zone) },
  ];
  const now = Date.parse(format.combineDateAndTime(date, "18:10", zone));
  const slots = timetableSlots(date, "18:00", "21:00", zone, bookings, now);
  assert.deepEqual(Array.from(slots, s => `${s.start}-${s.end}`), ["19:30-20:00", "20:30-21:00"]);
  assert.equal(slots[0].date, date);
  assert.equal(slots[0].minute, 19 * 60 + 30);
  assert.equal(slots[0].duration, 30);
});

test("owner timetable prefills the actual next date after midnight and stops at closing", () => {
  const slots = timetableSlots("2099-12-31", "23:30", "00:45", "UTC", [], 0);
  assert.deepEqual(Array.from(slots, s => [s.date, s.start, s.end, s.duration]), [
    ["2099-12-31", "23:30", "00:00", 30],
    ["2100-01-01", "00:00", "00:30", 30],
    ["2100-01-01", "00:30", "00:45", 15],
  ]);
});

test("owner timetable excludes nonexistent clock-change times", () => {
  const slots = timetableSlots("2027-03-14", "01:00", "04:00", "America/Indiana/Indianapolis", [], 0);
  assert.deepEqual(Array.from(slots, s => s.start), ["01:00", "03:00", "03:30"]);
});

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

test("the screenshot's two reservations both block their field-local half-hour slots", () => {
  const range = fieldDayRange("2099-10-14", "06:00", "22:00", "America/Indiana/Indianapolis");
  const slots = occupiedSlotLabels([
    { startTime: "2099-10-14T22:30Z", endTime: "2099-10-14T23:00Z" },
    { startTime: "2099-10-15T01:30Z", endTime: "2099-10-15T02:00Z" },
  ], "2099-10-14", range, "America/Indiana/Indianapolis");
  assert.deepEqual(Array.from(slots, slot => `${slot.startTime}-${slot.endTime}`), ["18:30-19:00", "21:30-22:00"]);
});

test("elapsed and nonexistent local slots are unavailable, including after midnight", () => {
  const now = Date.parse("2099-10-15T01:00Z");
  assert.equal(module.namespace.slotHasStarted(18 * 60 + 30, "2099-10-14", "America/Indiana/Indianapolis", now), true);
  assert.equal(module.namespace.slotHasStarted(21 * 60 + 30, "2099-10-14", "America/Indiana/Indianapolis", now), false);
  assert.equal(module.namespace.slotHasStarted(24 * 60 + 30, "2099-10-14", "America/Indiana/Indianapolis", now), false);
  assert.equal(module.namespace.slotHasStarted(2 * 60 + 30, "2027-03-14", "America/Indiana/Indianapolis", 0), true);
});

test("availability watchers refresh on changes and tab return, poll visible pages, and clean up", async () => {
  const window = new EventTarget(), document = new EventTarget();
  document.hidden = false;
  let timer, interval, cleared = false, count = 0;
  window.setInterval = (callback, delay) => { timer = callback; interval = delay; return 1; };
  window.clearInterval = () => { cleared = true; };
  const context = vm.createContext({ window, document });
  const source = await readFile(new URL("../src/lib/utils/reservationRefresh.ts", import.meta.url), "utf8");
  const module = new vm.SourceTextModule(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText, { context });
  await module.link(() => { throw new Error("Unexpected dependency"); });
  await module.evaluate();
  const stop = module.namespace.watchReservationChanges(() => count++);
  window.dispatchEvent(new Event("reservations:changed"));
  window.dispatchEvent(new Event("focus"));
  timer();
  assert.equal(count, 3);
  assert.equal(interval, 30000);
  document.hidden = true;
  timer();
  assert.equal(count, 3);
  document.hidden = false;
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(count, 4);
  stop();
  assert.equal(cleared, true);
  window.dispatchEvent(new Event("reservations:changed"));
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(count, 4);
});
