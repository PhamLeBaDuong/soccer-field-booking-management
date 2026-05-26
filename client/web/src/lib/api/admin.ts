import {
  apiFetch,
  canFallBackToMock,
  shouldUseMockData,
  warnMockData,
} from "@/lib/api/client";
import { normalizeComplex, normalizeField } from "@/lib/api/normalizers";
import { mockComplexes, mockFields } from "@/lib/mock/fields";
import type { Complex, ComplexPayload, Field, FieldPayload } from "@/lib/types";

export async function getAdminComplexes(): Promise<Complex[]> {
  if (shouldUseMockData()) {
    warnMockData("Admin complexes");
    return mockComplexes;
  }

  try {
    const response = await apiFetch<unknown[]>("/api/admin/complexes");
    return response.map(normalizeComplex);
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Admin complexes");
      return mockComplexes;
    }
    throw error;
  }
}

export async function getAdminFields(): Promise<Field[]> {
  if (shouldUseMockData()) {
    warnMockData("Admin fields");
    return mockFields;
  }

  try {
    const complexes = await getAdminComplexes();
    const response = await apiFetch<unknown[]>("/api/admin/fields");
    return response.map((field) => normalizeField(field, complexes));
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Admin fields");
      return mockFields;
    }
    throw error;
  }
}

export async function createComplex(payload: ComplexPayload): Promise<Complex> {
  if (shouldUseMockData()) {
    warnMockData("Create complex");
    return { id: `complex-${Date.now()}`, ...payload, owner: payload.ownerId };
  }

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
  if (shouldUseMockData()) {
    warnMockData("Update complex");
    return { id, ...payload, owner: payload.ownerId };
  }

  const response = await apiFetch<{ complex: unknown }>(`/api/admin/complexes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeComplex(response.complex);
}

export async function deleteComplex(id: string): Promise<void> {
  if (shouldUseMockData()) {
    warnMockData("Delete complex");
    return;
  }

  await apiFetch<{ message: string }>(`/api/admin/complexes/${id}`, {
    method: "DELETE",
  });
}

export async function createField(payload: FieldPayload): Promise<Field> {
  if (shouldUseMockData()) {
    warnMockData("Create field");
    const complex = mockComplexes.find((item) => item.id === payload.complexId);
    return {
      id: `field-${Date.now()}`,
      complexId: payload.complexId,
      name: payload.name,
      description: payload.description,
      address: payload.address,
      type: payload.type,
      startTime: payload.startTime,
      endTime: payload.endTime,
      indoor: payload.indoor,
      lights: payload.lights,
      metadata: { price: payload.price, currency: payload.currency },
      occupiedTimes: [],
      complex,
    };
  }

  const response = await apiFetch<{ field: unknown }>("/api/admin/fields", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeField(response.field);
}

export async function updateField(id: string, payload: FieldPayload): Promise<Field> {
  if (shouldUseMockData()) {
    warnMockData("Update field");
    const complex = mockComplexes.find((item) => item.id === payload.complexId);
    return {
      id,
      complexId: payload.complexId,
      name: payload.name,
      description: payload.description,
      address: payload.address,
      type: payload.type,
      startTime: payload.startTime,
      endTime: payload.endTime,
      indoor: payload.indoor,
      lights: payload.lights,
      metadata: { price: payload.price, currency: payload.currency },
      occupiedTimes: [],
      complex,
    };
  }

  const response = await apiFetch<{ field: unknown }>(`/api/admin/fields/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeField(response.field);
}

export async function deleteField(id: string): Promise<void> {
  if (shouldUseMockData()) {
    warnMockData("Delete field");
    return;
  }

  await apiFetch<{ message: string }>(`/api/admin/fields/${id}`, {
    method: "DELETE",
  });
}

