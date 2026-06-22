import { BOOKING_STATUSES, DEFAULT_CURRENCY } from "@/lib/constants";
import type { Booking, BookingStatus, Complex, Field, PaymentMethod, PaymentStatus, User } from "@/lib/types";
import { toDisplayTime } from "@/lib/utils/format";

type DataRecord = Record<string, unknown>;

function isRecord(value: unknown): value is DataRecord {
  return typeof value === "object" && value !== null;
}

function readString(record: DataRecord, key: string, fallback = ""): string {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(record: DataRecord, key: string, fallback = 0): number {
  const value = record[key];
  return typeof value === "number" ? value : fallback;
}

function readBoolean(record: DataRecord, key: string, fallback = false): boolean {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}

function readOwner(value: unknown, fallback = "PitchBook Admin"): string {
  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value)) {
    return readString(value, "name", readString(value, "username", fallback));
  }

  return fallback;
}

function readPrice(record: DataRecord): { price: number; currency?: string } {
  // New backend schema stores price directly as pricePerHour on Field
  if (record.pricePerHour !== undefined) {
    return { price: readNumber(record, "pricePerHour", 0), currency: DEFAULT_CURRENCY };
  }

  // Legacy: price inside a metadata object
  const metadata = record.metadata;
  if (isRecord(metadata)) {
    return {
      price: readNumber(metadata, "price", 0),
      currency: readString(metadata, "currency", DEFAULT_CURRENCY),
    };
  }

  return { price: 0, currency: DEFAULT_CURRENCY };
}

function readOccupiedTimes(record: DataRecord): { startTime: string; endTime: string }[] {
  const direct = record.occupiedTimes;
  if (Array.isArray(direct)) {
    return direct
      .filter(isRecord)
      .map((slot) => ({
        startTime: readString(slot, "startTime"),
        endTime: readString(slot, "endTime"),
      }))
      .filter((slot) => slot.startTime && slot.endTime);
  }

  const starts = record.listOccupiedStartTime;
  const ends = record.listOccupiedEndTime;
  if (!Array.isArray(starts) || !Array.isArray(ends)) {
    return [];
  }

  return starts
    .map((start, index) => {
      const end = ends[index];
      return typeof start === "string" && typeof end === "string"
        ? { startTime: toDisplayTime(start), endTime: toDisplayTime(end) }
        : null;
    })
    .filter((slot): slot is { startTime: string; endTime: string } => slot !== null);
}

function normalizeStatus(value: string): BookingStatus {
  if (BOOKING_STATUSES.includes(value as BookingStatus)) {
    return value as BookingStatus;
  }

  return value === "confirmed" || value === "canceled" ? value : "pending";
}

export function normalizeUser(value: unknown): User {
  const record = isRecord(value) ? value : {};
  const username = readString(record, "username", "player");
  const name = readString(record, "name", username);

  return {
    id: readString(record, "id", readString(record, "userId", "demo-user")),
    name,
    username,
    email: readString(record, "email"),
    phone: readString(record, "phone"),
    role: readString(record, "role") === "admin" ? "admin" : "player",
  };
}

export function normalizeComplex(value: unknown): Complex {
  const record = isRecord(value) ? value : {};
  const fields = record.fields;

  return {
    id: readString(record, "id"),
    name: readString(record, "name", "Unnamed Complex"),
    description: readString(record, "description", readString(record, "desc")),
    address: readString(record, "address", "Ho Chi Minh City"),
    lat: readNumber(record, "lat"),
    lng: readNumber(record, "lng"),
    owner: readOwner(record.owner, readString(record, "ownerId", "PitchBook Admin")),
    fieldsCount: Array.isArray(fields) ? fields.length : undefined,
  };
}

export function normalizeField(value: unknown, complexes: Complex[] = []): Field {
  const record = isRecord(value) ? value : {};
  const complexValue = record.complex;
  const complex =
    isRecord(complexValue)
      ? normalizeComplex(complexValue)
      : complexes.find((item) => item.id === readString(record, "complexId"));
  const metadata = readPrice(record);

  return {
    id: readString(record, "id"),
    complexId: readString(record, "complexId", complex?.id ?? ""),
    name: readString(record, "name", "Unnamed Field"),
    description: readString(record, "description", readString(record, "desc")),
    address: readString(record, "address", complex?.address ?? "Ho Chi Minh City"),
    type: readString(record, "type", "5v5"),
    startTime: toDisplayTime(readString(record, "startTime", "06:00")),
    endTime: toDisplayTime(readString(record, "endTime", "22:00")),
    indoor: readBoolean(record, "indoor"),
    lights: readBoolean(record, "lights"),
    metadata,
    occupiedTimes: readOccupiedTimes(record),
    complex,
  };
}

export function normalizeBooking(value: unknown, fields: Field[] = []): Booking {
  const record = isRecord(value) ? value : {};
  const fieldValue = record.field;
  const field =
    isRecord(fieldValue)
      ? normalizeField(fieldValue)
      : fields.find((item) => item.id === readString(record, "fieldId"));

  const rawPaymentStatus = readString(record, "paymentStatus", "unpaid");
  const paymentStatus: PaymentStatus =
    rawPaymentStatus === "paid" || rawPaymentStatus === "refunded" ? rawPaymentStatus : "unpaid";

  const rawPaymentMethod = record.paymentMethod;
  const paymentMethod: PaymentMethod | undefined =
    typeof rawPaymentMethod === "string" ? rawPaymentMethod as PaymentMethod : undefined;

  return {
    id: readString(record, "id"),
    userId: readString(record, "userId"),
    fieldId: readString(record, "fieldId", field?.id ?? ""),
    startTime: readString(record, "startTime"),
    endTime: readString(record, "endTime"),
    needMatching: readBoolean(record, "needMatching"),
    teamSize: readNumber(record, "teamSize", 5),
    status: normalizeStatus(readString(record, "status", "pending")),
    totalPrice: readNumber(record, "totalPrice"),
    currency: readString(record, "currency", DEFAULT_CURRENCY),
    paymentStatus,
    paymentMethod,
    field,
    user: isRecord(record.user) ? normalizeUser(record.user) : undefined,
  };
}

