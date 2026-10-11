import test from "node:test";
import assert from "node:assert/strict";
import { combineDateAndTime, durationHours, formatDateRange, nextCalendarDate } from "../src/lib/utils/format.ts";
import { validateReservationTime } from "../../../server/src/services/reservationService.js";

const field = {
  startTime: "2000-01-01T06:00:00.000Z",
  endTime: "2000-01-01T22:00:00.000Z",
  pricePerHour: 100,
};

test("selected field times stay within operating hours regardless of browser timezone", () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ["UTC", "America/Indiana/Indianapolis", "Asia/Ho_Chi_Minh", "Pacific/Auckland"]) {
      process.env.TZ = timezone;
      for (const [start, end, hours] of [["15:30", "17:00", 1.5], ["15:30", "19:00", 3.5], ["06:00", "22:00", 16]]) {
        const startIso = combineDateAndTime("2099-10-11", start);
        const endIso = combineDateAndTime("2099-10-11", end);
        assert.equal(startIso, `2099-10-11T${start}:00.000Z`, timezone);
        assert.equal(endIso, `2099-10-11T${end}:00.000Z`, timezone);
        assert.equal(validateReservationTime(field, startIso, endIso).totalPrice, hours * 100);
        assert.equal(durationHours(startIso, endIso), hours);
        assert.ok(formatDateRange(startIso, endIso).endsWith(`${start}-${end}`), timezone);
      }
      assert.throws(() => validateReservationTime(field,
        combineDateAndTime("2099-10-11", "21:30"),
        combineDateAndTime("2099-10-11", "22:30")), /outside field operating hours/);
      assert.equal(nextCalendarDate("2099-12-31"), "2100-01-01");
      assert.equal(nextCalendarDate("2028-02-28"), "2028-02-29");
      const overnight = { ...field, startTime: "2000-01-01T18:00:00.000Z", endTime: "2000-01-01T02:00:00.000Z" };
      const overnightStart = combineDateAndTime("2099-10-11", "23:30");
      const overnightEnd = combineDateAndTime(nextCalendarDate("2099-10-11"), "01:00");
      assert.equal(validateReservationTime(overnight, overnightStart, overnightEnd).totalPrice, 150);
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});
