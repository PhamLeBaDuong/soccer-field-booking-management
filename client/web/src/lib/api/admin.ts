import { apiFetch } from "@/lib/api/client";
import { normalizeComplex, normalizeField } from "@/lib/api/normalizers";

import type { Complex, ComplexPayload, Field, FieldPayload } from "@/lib/types";

export async function getAdminComplexes(): Promise<Complex[]> {
  const response = await apiFetch<unknown[]>("/api/admin/complexes");
  return response.map(normalizeComplex);
}

export async function getAdminFields(): Promise<Field[]> {
  const complexes = await getAdminComplexes();
  const response = await apiFetch<unknown[]>("/api/admin/fields");
  return response.map((field) => normalizeField(field, complexes));
}

export async function createComplex(payload: ComplexPayload): Promise<Complex> {
  const response = await apiFetch<{ complex: unknown }>("/api/admin/complexes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeComplex(response.complex);
}

export async function updateComplex(
  id: string,
  payload: ComplexPayload,
): Promise<Complex> {
  const response = await apiFetch<{ complex: unknown }>(`/api/admin/complexes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeComplex(response.complex);
}

export async function deleteComplex(id: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/admin/complexes/${id}`, {
    method: "DELETE",
  });
}

export async function createField(payload: FieldPayload): Promise<Field> {
  const response = await apiFetch<{ field: unknown }>("/api/admin/fields", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeField(response.field);
}

export async function updateField(id: string, payload: FieldPayload): Promise<Field> {
  const response = await apiFetch<{ field: unknown }>(`/api/admin/fields/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeField(response.field);
}

export async function deleteField(id: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/admin/fields/${id}`, {
    method: "DELETE",
  });
}
