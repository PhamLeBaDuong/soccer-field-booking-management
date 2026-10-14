import { apiFetch } from "@/lib/api/client";
import { normalizeComplex, normalizeField } from "@/lib/api/normalizers";

import type { Complex, Field } from "@/lib/types";

export async function getComplexes(): Promise<Complex[]> {
  const response = await apiFetch<unknown[]>("/api/admin/complexes");
  return response.map(normalizeComplex);
}

export async function getFields(): Promise<Field[]> {
  // The authenticated field endpoint includes the complex.
  const response = await apiFetch<unknown[]>("/api/fields");
  return response.map((field) => normalizeField(field));
}

export async function getFieldsByComplexId(complexId: string): Promise<Field[]> {
  const response = await apiFetch<unknown[]>(`/api/fields?complexId=${complexId}`);
  return response.map((field) => normalizeField(field));
}

export async function getFieldById(fieldId: string): Promise<Field> {
  const response = await apiFetch<unknown>(`/api/fields/${fieldId}`);
  return normalizeField(response);
}
