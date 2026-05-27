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
    // /api/fields is the public read endpoint — complex is already embedded
    const response = await apiFetch<unknown[]>("/api/fields");
    return response.map((field) => normalizeField(field));
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
    const response = await apiFetch<unknown[]>(`/api/fields?complexId=${complexId}`);
    return response.map((field) => normalizeField(field));
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Complex fields");
      return mockFields.filter((field) => field.complexId === complexId);
    }

    throw error;
  }
}

export async function getFieldById(fieldId: string): Promise<Field> {
  if (shouldUseMockData()) {
    const field = mockFields.find((item) => item.id === fieldId);
    if (!field) throw new Error("Field not found");
    return field;
  }

  try {
    const response = await apiFetch<unknown>(`/api/fields/${fieldId}`);
    return normalizeField(response);
  } catch (error) {
    if (canFallBackToMock(error)) {
      const field = mockFields.find((item) => item.id === fieldId);
      if (!field) throw error;
      return field;
    }
    throw error;
  }
}

