import { combineDateAndTime, minutesToTime, nextCalendarDate, timeToMinutes } from "./format";

export type BookingRepeat = { frequency: "weekly" | "monthly"; until: string };
export type OccupiedSlot = { startTime: string; endTime: string };

export function timetableSlots(date: string, open: string, close: string, timeZone: string, bookings: OccupiedSlot[], now = Date.now()) {
  const first = timeToMinutes(open);
  let last = timeToMinutes(close);
  if (last <= first) last += 1440;
  const slots = [];
  for (let minute = first; minute < last; minute += 30) {
    const finish = Math.min(minute + 30, last);
    const slotDate = minute >= 1440 ? nextCalendarDate(date) : date;
    const start = minutesToTime(minute % 1440);
    const end = minutesToTime(finish % 1440);
    try {
      const startTime = Date.parse(combineDateAndTime(slotDate, start, timeZone));
      const endTime = Date.parse(combineDateAndTime(finish >= 1440 ? nextCalendarDate(date) : date, end, timeZone));
      if (startTime <= now || endTime <= startTime) continue;
      if (bookings.some(b => Date.parse(b.startTime) < endTime && Date.parse(b.endTime) > startTime)) continue;
      slots.push({ date: slotDate, start, end, minute, duration: finish - minute });
    } catch { /* A clock-change gap has no bookable local time. */ }
  }
  return slots;
}

export function slotHasStarted(startMinutes: number, date: string | undefined, timeZone: string, now: number) {
  if (!date) return false;
  const slotDate = startMinutes >= 1440 ? nextCalendarDate(date) : date;
  const clock = `${String(Math.floor((startMinutes % 1440) / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`;
  try { return Date.parse(combineDateAndTime(slotDate, clock, timeZone)) <= now; }
  catch { return true; }
}

export function reservationClock(value: string, timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

export function repeatBookingPreview(date: string, start: string, end: string, timeZone: string, price: number, repeat?: BookingRepeat) {
  if (!repeat || !date || !start || !end || !repeat.until || repeat.until < date) return { count: 0, total: 0, error: "" };
  try {
    let count = 0, total = 0;
    const anchor = new Date(`${date}T00:00Z`);
    for (let index = 0; ; index++) {
      let next: Date;
      if (repeat.frequency === "weekly") next = new Date(+anchor + index * 7 * 86400000);
      else {
        next = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + index, 1));
        if (next.toISOString().slice(0, 10) > repeat.until) break;
        next.setUTCDate(anchor.getUTCDate());
        if (next.getUTCDate() !== anchor.getUTCDate()) continue;
      }
      const nextDate = next.toISOString().slice(0, 10);
      if (nextDate > repeat.until) break;
      if (++count > 104) throw new Error("Choose an end date with at most 104 bookings.");
      const finishDate = timeToMinutes(end) < timeToMinutes(start) ? nextCalendarDate(nextDate) : nextDate;
      total += (Date.parse(combineDateAndTime(finishDate, end, timeZone)) - Date.parse(combineDateAndTime(nextDate, start, timeZone))) / 3600000 * price;
    }
    return { count, total, error: "" };
  } catch (error) {
    return { count: 0, total: 0, error: error instanceof Error ? error.message : "Invalid recurring dates." };
  }
}

export function fieldDayRange(date: string, open: string, close: string, timeZone: string) {
  return { startTime: combineDateAndTime(date, open, timeZone),
    endTime: combineDateAndTime(timeToMinutes(close) <= timeToMinutes(open) ? nextCalendarDate(date) : date, close, timeZone) };
}

export function occupiedSlotLabels(slots: OccupiedSlot[], date: string, range: OccupiedSlot, timeZone: string): OccupiedSlot[] {
  const formatter = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const label = (instant: number) => {
    const parts = formatter.formatToParts(new Date(instant));
    const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
    const days = (Date.UTC(get("year"), get("month") - 1, get("day")) - Date.parse(`${date}T00:00Z`)) / 86400000;
    return `${String(days * 24 + get("hour")).padStart(2, "0")}:${String(get("minute")).padStart(2, "0")}`;
  };
  return slots.flatMap(slot => {
    const start = Math.max(Date.parse(slot.startTime), Date.parse(range.startTime));
    const end = Math.min(Date.parse(slot.endTime), Date.parse(range.endTime));
    return start < end ? [{ startTime: label(start), endTime: label(end) }] : [];
  });
}
