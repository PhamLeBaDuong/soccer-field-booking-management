import {
  apiFetch,
  canFallBackToMock,
  shouldUseMockData,
  warnMockData,
} from "@/lib/api/client";
import { normalizeComplex, normalizeField } from "@/lib/api/normalizers";
import { mockComplexes, mockFields } from "@/lib/mock/fields";
import type { Complex, Field } from "@/lib/types";

export async function getComplexes(): Promise<Complex[]> {
  if (shouldUseMockData()) {
    warnMockData("Complexes");
    return mockComplexes;
  }

  try {
    const response = await apiFetch<unknown[]>("/api/admin/complexes");
    return response.map(normalizeComplex);
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Complexes");
      return mockComplexes;
    }

    throw error;
  }
}

export async function getFields(): Promise<Field[]> {
  if (shouldUseMockData()) {
    warnMockData("Fields");
    return mockFields;
  }

  try {
    const complexes = await getComplexes();
    const response = await apiFetch<unknown[]>("/api/admin/fields");
    return response.map((field) => normalizeField(field, complexes));
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Fields");
      return mockFields;
    }

    throw error;
  }
}

export async function getFieldsByComplexId(complexId: string): Promise<Field[]> {
  if (shouldUseMockData()) {
    warnMockData("Complex fields");
    return mockFields.filter((field) => field.complexId === complexId);
  }

  try {
    const response = await apiFetch<unknown[]>(
      `/api/admin/complexes/${complexId}/fields`,
    );
    const complexes = await getComplexes();
    return response.map((field) => normalizeField(field, complexes));
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Complex fields");
      return mockFields.filter((field) => field.complexId === complexId);
    }

    throw error;
  }
}

export async function getFieldById(fieldId: string): Promise<Field> {
  const fields = await getFields();
  const field = fields.find((item) => item.id === fieldId);

  if (!field) {
    throw new Error("Field not found");
  }

  return field;
}

