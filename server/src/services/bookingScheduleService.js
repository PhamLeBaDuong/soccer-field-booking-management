import { reservationTimeZone } from "./reservationService.js";

export function assertCalendarDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)
        || !Number.isFinite(+new Date(`${value}T00:00Z`))
        || new Date(`${value}T00:00Z`).toISOString().slice(0, 10) !== value) {
        throw new Error("Invalid booking date");
    }
    return value;
}

export function addCalendarDays(date, days) {
    const value = new Date(`${assertCalendarDate(date)}T00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

export function localBookingParts(value, timeZone) {
    const date = new Date(value);
    if (!Number.isFinite(+date)) throw new Error("Invalid booking dates");
    const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit",
        day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const get = type => parts.find(part => part.type === type).value;
    return { date: `${get("year")}-${get("month")}-${get("day")}`,
        time: `${get("hour")}:${get("minute")}:${get("second")}.${String(date.getUTCMilliseconds()).padStart(3, "0")}` };
}

export function zonedBookingTime(date, time, timeZone) {
    assertCalendarDate(date);
    if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d\.\d{3})?$/.test(time)) {
        throw new Error("Invalid booking time");
    }
    const clock = time.length === 5 ? `${time}:00.000` : time;
    const wall = +new Date(`${date}T${clock}Z`);
    let instant = wall;
    for (let attempt = 0; attempt < 4; attempt++) {
        const shown = localBookingParts(instant, timeZone);
        const shownWall = +new Date(`${shown.date}T${shown.time}Z`);
        if (shownWall === wall) return new Date(instant);
        instant += wall - shownWall;
    }
    throw new Error(`Invalid local booking time on ${date}: clocks change. Choose another slot.`);
}

export function bookingDayRange(date, field) {
    const timeZone = reservationTimeZone(field);
    const open = new Date(field.startTime).toISOString().slice(11, 16);
    const close = new Date(field.endTime).toISOString().slice(11, 16);
    return { start: zonedBookingTime(date, open, timeZone),
        end: zonedBookingTime(close <= open ? addCalendarDays(date, 1) : date, close, timeZone) };
}

export function bookingOccurrences(field, startTime, endTime, repeat) {
    if (repeat == null) return [{ startTime, endTime }];
    if (!repeat || !["weekly", "monthly"].includes(repeat.frequency)) throw new Error("Invalid booking repeat frequency");
    const until = assertCalendarDate(repeat.until);
    const timeZone = reservationTimeZone(field);
    const first = localBookingParts(startTime, timeZone), last = localBookingParts(endTime, timeZone);
    if (until < first.date) throw new Error("Repeat end date must be on or after the first booking date");
    const endDayOffset = (+new Date(`${last.date}T00:00Z`) - +new Date(`${first.date}T00:00Z`)) / 86400000;
    if (endDayOffset < 0 || endDayOffset > 1) throw new Error("Invalid booking duration");
    const result = [];
    const anchor = new Date(`${first.date}T00:00Z`);
    for (let index = 0; ; index++) {
        let date;
        if (repeat.frequency === "weekly") date = addCalendarDays(first.date, index * 7);
        else {
            const month = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + index, 1));
            if (month.toISOString().slice(0, 10) > until) break;
            month.setUTCDate(anchor.getUTCDate());
            // Keep the same calendar date; skip months that do not have that day.
            if (month.getUTCDate() !== anchor.getUTCDate()) continue;
            date = month.toISOString().slice(0, 10);
        }
        if (date > until) break;
        if (result.length >= 104) throw new Error("Fixed booking must contain at most 104 dates");
        result.push({ startTime: index === 0 ? new Date(startTime) : zonedBookingTime(date, first.time, timeZone),
            endTime: index === 0 ? new Date(endTime) : zonedBookingTime(addCalendarDays(date, endDayOffset), last.time, timeZone) });
    }
    return result;
}
