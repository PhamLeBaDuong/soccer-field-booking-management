import {
  apiFetch,
  canFallBackToMock,
  shouldUseMockData,
  warnMockData,
} from "@/lib/api/client";
import { normalizeBooking, normalizeField } from "@/lib/api/normalizers";
import { getFields } from "@/lib/api/fields";
import { mockBookings, mockMatchingBookings } from "@/lib/mock/bookings";
import { mockFields } from "@/lib/mock/fields";
import type { Booking, BookingPayload, MatchingSearch } from "@/lib/types";

function createMockBooking(payload: BookingPayload): Booking {
  const field = mockFields.find((item) => item.id === payload.fieldId);

  return {
    id: `booking-${Date.now()}`,
    userId: payload.userId,
    fieldId: payload.fieldId,
    startTime: payload.startTime,
    endTime: payload.endTime,
    needMatching: payload.needMatching,
    teamSize: payload.teamSize,
    status: payload.needMatching ? "matching" : "pending",
    totalPrice:
      payload.fieldPrice *
      Math.max(
        1,
        (new Date(payload.endTime).getTime() -
          new Date(payload.startTime).getTime()) /
          3_600_000,
      ),
    currency: payload.currency,
    field,
  };
}

export async function getUserBookings(userId: string): Promise<Booking[]> {
  if (shouldUseMockData()) {
    warnMockData("Bookings");
    return mockBookings.map((booking) => ({ ...booking, userId }));
  }

  try {
    const fields = await getFields();
    const response = await apiFetch<unknown[]>(`/api/bookings/user/${userId}`);
    return response.map((booking) => normalizeBooking(booking, fields));
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Bookings");
      return mockBookings.map((booking) => ({ ...booking, userId }));
    }

    throw error;
  }
}

export async function getBookingById(bookingId: string): Promise<Booking> {
  if (shouldUseMockData()) {
    warnMockData("Booking detail");
    const booking = [...mockBookings, ...mockMatchingBookings].find(
      (item) => item.id === bookingId,
    );
    if (!booking) {
      throw new Error("Booking not found");
    }
    return booking;
  }

  try {
    const booking = normalizeBooking(await apiFetch<unknown>(`/api/bookings/${bookingId}`));
    const field = normalizeField(
      await apiFetch<unknown>(`/api/bookings/${bookingId}/field`),
    );
    return { ...booking, field };
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Booking detail");
      const booking = [...mockBookings, ...mockMatchingBookings].find(
        (item) => item.id === bookingId,
      );
      if (!booking) {
        throw error;
      }
      return booking;
    }

    throw error;
  }
}

export async function createBooking(payload: BookingPayload): Promise<Booking> {
  if (shouldUseMockData()) {
    warnMockData("Create booking");
    return createMockBooking(payload);
  }

  try {
    const fields = await getFields();
    const response = await apiFetch<unknown>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeBooking(response, fields);
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Create booking");
      return createMockBooking(payload);
    }

    throw error;
  }
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  if (shouldUseMockData()) {
    warnMockData("Cancel booking");
    const booking = mockBookings.find((item) => item.id === bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }
    return { ...booking, status: "canceled" };
  }

  const fields = await getFields();
  const response = await apiFetch<unknown>(`/api/bookings/${bookingId}`, {
    method: "DELETE",
  });
  return normalizeBooking(response, fields);
}

export async function confirmBooking(
  bookingId: string,
  startTime: string,
  endTime: string,
): Promise<Booking> {
  const fields = await getFields();
  const response = await apiFetch<unknown>(`/api/bookings/${bookingId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ startTime, endTime }),
  });
  return normalizeBooking(response, fields);
}

export async function searchMatchingBookings(
  search: MatchingSearch,
): Promise<Booking[]> {
  if (shouldUseMockData()) {
    warnMockData("Matching");
    return mockMatchingBookings.filter(
      (booking) => booking.teamSize === search.teamSize,
    );
  }

  const query = new URLSearchParams({
    teamsize: String(search.teamSize),
    startTime: search.startTime,
    endTime: search.endTime,
  });

  if (search.fieldId) {
    query.set("fieldId", search.fieldId);
  }

  try {
    const endpoint = search.fieldId
      ? `/api/bookings/matchingbyfieldid?${query.toString()}`
      : `/api/bookings/matching?${query.toString()}`;
    const fields = await getFields();
    const response = await apiFetch<unknown[]>(endpoint);
    return response.map((booking) => normalizeBooking(booking, fields));
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Matching");
      return mockMatchingBookings.filter(
        (booking) => booking.teamSize === search.teamSize,
      );
    }

    throw error;
  }
}

export async function joinMatch(
  booking1Id: string,
  booking2Id: string,
  startTime: string,
  endTime: string,
  fieldId: string,
): Promise<{ updatedBooking1: Booking; updatedBooking2: Booking }> {
  if (shouldUseMockData()) {
    warnMockData("Join match");
    const booking = mockMatchingBookings.find((item) => item.id === booking1Id);
    const joined = booking
      ? { ...booking, status: "confirmed" as const, needMatching: false }
      : mockMatchingBookings[0];
    return { updatedBooking1: joined, updatedBooking2: joined };
  }

  const response = await apiFetch<{
    updatedBooking1: unknown;
    updatedBooking2: unknown;
  }>("/api/bookings/match", {
    method: "POST",
    body: JSON.stringify({ booking1Id, booking2Id, startTime, endTime, fieldId }),
  });

  const fields = await getFields();
  return {
    updatedBooking1: normalizeBooking(response.updatedBooking1, fields),
    updatedBooking2: normalizeBooking(response.updatedBooking2, fields),
  };
}

