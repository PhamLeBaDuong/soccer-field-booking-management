export function formatCurrency(value: number, currency = "VND"): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(value);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateRange(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startTime} - ${endTime}`;
  }

  const date = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  const startLabel = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en", {
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

export function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function durationHours(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
  }

  return Math.max(0, (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60);
}

export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
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
