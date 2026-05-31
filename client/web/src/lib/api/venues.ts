import { apiFetch } from "@/lib/api/client";
import { normalizeComplex, normalizeField } from "@/lib/api/normalizers";
import type { Complex, Field } from "@/lib/types";

// ─── Complexes ────────────────────────────────────────────────────────────────

export async function getMyVenueComplexes(): Promise<Complex[]> {
  const raw = await apiFetch<unknown[]>("/api/venues/complexes");
  return raw.map(normalizeComplex);
}

export async function createVenueComplex(payload: {
  name: string;
  address: string;
  description?: string;
  lat?: number;
  lng?: number;
}): Promise<Complex> {
  const res = await apiFetch<{ complex: unknown }>("/api/venues/complexes", {
    method: "POST",
    body:   JSON.stringify(payload),
  });
  return normalizeComplex(res.complex);
}

export async function updateVenueComplex(id: string, payload: {
  name?: string;
  address?: string;
  description?: string;
}): Promise<Complex> {
  const res = await apiFetch<{ complex: unknown }>(`/api/venues/complexes/${id}`, {
    method: "PUT",
    body:   JSON.stringify(payload),
  });
  return normalizeComplex(res.complex);
}

export async function deleteVenueComplex(id: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/venues/complexes/${id}`, { method: "DELETE" });
}

// ─── Fields ───────────────────────────────────────────────────────────────────

export async function getVenueFields(complexId: string): Promise<Field[]> {
  const raw = await apiFetch<unknown[]>(`/api/venues/complexes/${complexId}/fields`);
  return raw.map((f) => normalizeField(f));
}

export async function createVenueField(complexId: string, payload: {
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  indoor?: boolean;
  lights?: boolean;
  price?: number;
  address?: string;
  description?: string;
}): Promise<Field> {
  const res = await apiFetch<{ field: unknown }>(`/api/venues/complexes/${complexId}/fields`, {
    method: "POST",
    body:   JSON.stringify(payload),
  });
  return normalizeField(res.field);
}

export async function updateVenueField(id: string, payload: {
  name?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  indoor?: boolean;
  lights?: boolean;
  price?: number;
}): Promise<Field> {
  const res = await apiFetch<{ field: unknown }>(`/api/venues/fields/${id}`, {
    method: "PUT",
    body:   JSON.stringify(payload),
  });
  return normalizeField(res.field);
}

export async function deleteVenueField(id: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/venues/fields/${id}`, { method: "DELETE" });
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export async function getVenueFieldSchedule(fieldId: string, date: string) {
  return apiFetch<import("@/lib/api/adminSchedule").ScheduleBooking[]>(
    `/api/venues/fields/${fieldId}/schedule?date=${date}`,
  );
}

export async function createManualBooking(fieldId: string, payload: {
  date: string;
  startTime: string;
  endTime: string;
  customerName?: string;
  note?: string;
}): Promise<void> {
  await apiFetch(`/api/venues/fields/${fieldId}/manual-booking`, {
    method: "POST",
    body:   JSON.stringify(payload),
  });
}
