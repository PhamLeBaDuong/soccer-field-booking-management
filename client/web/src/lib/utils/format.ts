export function formatCurrency(value: number, currency = "VND"): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(value);
}

export function formatDateTime(value: string, timeZone = bookingTimeZone()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateRange(startTime: string, endTime: string, timeZone = bookingTimeZone()): string {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startTime} - ${endTime}`;
  }

  const date = new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  const startLabel = new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(end);

  return `${date} - ${startLabel}-${endLabel}`;
}

export function toDisplayTime(value: string): string {
  // Already in HH:MM format — return as-is
  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  // ISO timestamp — extract the UTC HH:MM directly.
  // Field operating hours are stored in UTC as a proxy for local time
  // (e.g. "2000-01-01T06:00:00.000Z" means "opens at 06:00").
  const isoMatch = value.match(/T(\d{2}:\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function timeToMinutes(value: string): number {
  const label = toDisplayTime(value);
  const [hours, minutes] = label.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value: number): string {
  const normalized = value % (24 * 60);
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function bookingTimeZone(): string {
  // Field hours use a shared clock, never the viewer's browser timezone.
  return "UTC";
}

export function combineDateAndTime(date: string, time: string, timeZone = bookingTimeZone()): string {
  const wall = new Date(`${date}T${time}:00.000Z`).getTime();
  const formatter = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  let instant = wall;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = formatter.formatToParts(new Date(instant));
    const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
    const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    if (shown === wall) return new Date(instant).toISOString();
    instant += wall - shown;
  }
  throw new Error("This local time does not exist because the clocks change. Choose another slot.");
}

export function nextCalendarDate(date: string): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function durationHours(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
  }

  return Math.max(0, (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60);
}

export function todayInputValue(timeZone = bookingTimeZone()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
