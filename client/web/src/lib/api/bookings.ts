import { apiFetch } from "@/lib/api/client";
import { normalizeBooking } from "@/lib/api/normalizers";
import { getFields } from "@/lib/api/fields";

import type { Booking, BookingPayload, MatchingSearch, PaymentMethod, PaymentOption } from "@/lib/types";
import type { BookingRepeat } from "@/lib/utils/reservations";

export async function getUserBookings(userId: string): Promise<Booking[]> {
  const fields = await getFields();
  const response = await apiFetch<unknown[]>(`/api/bookings/user/${userId}`);
  return response.map((booking) => normalizeBooking(booking, fields));
}

export async function getBookingById(bookingId: string): Promise<Booking> {
  return normalizeBooking(await apiFetch<unknown>("/api/bookings/" + bookingId));
}
export async function createBooking(payload: Pick<BookingPayload, "fieldId" | "startTime" | "endTime">): Promise<Booking> {
  // Reservation failures must be visible; never replace a failed POST with a fake success.
  const response = await apiFetch<unknown>("/api/bookings", {
    method: "POST", body: JSON.stringify(payload),
  });
  return normalizeBooking(response);
}

export async function createFixedBooking(payload: Pick<BookingPayload, "fieldId" | "startTime" | "endTime"> & { repeat: BookingRepeat }): Promise<{ bookings: Booking[]; totalPrice: number }> {
  const result = await apiFetch<{ bookings: unknown[]; totalPrice: number }>("/api/bookings/fixed", {
    method: "POST", body: JSON.stringify(payload),
  });
  return { bookings: result.bookings.map(booking => normalizeBooking(booking)), totalPrice: result.totalPrice };
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
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
  const query = new URLSearchParams({
    teamsize: String(search.teamSize),
    startTime: search.startTime,
    endTime: search.endTime,
  });

  if (search.fieldId) {
    query.set("fieldId", search.fieldId);
  }

  const endpoint = search.fieldId
    ? `/api/bookings/matchingbyfieldid?${query.toString()}`
    : `/api/bookings/matching?${query.toString()}`;
  const fields = await getFields();
  const response = await apiFetch<unknown[]>(endpoint);
  return response.map((booking) => normalizeBooking(booking, fields));
}

export async function getPaymentOptions(bookingId: string): Promise<PaymentOption[]> {
  return apiFetch<PaymentOption[]>(`/api/bookings/${bookingId}/payment-options`);
}

export async function payBooking(
  bookingId: string,
  paymentMethod: PaymentMethod,
): Promise<Booking | { redirectUrl: null; message: string }> {
  const fields = await getFields();
  const result = await apiFetch<unknown>(`/api/bookings/${bookingId}/pay`, {
    method: "POST",
    body: JSON.stringify({ paymentMethod }),
  });
  if (
    typeof result === "object" &&
    result !== null &&
    "message" in result &&
    !("id" in result)
  ) {
    return result as { redirectUrl: null; message: string };
  }
  return normalizeBooking(result, fields);
}

export async function createStripeCheckout(
  bookingId: string,
): Promise<{ url: string; sessionId: string }> {
  return apiFetch(`/api/bookings/${bookingId}/checkout/stripe`, { method: "POST" });
}

export async function verifyStripePayment(
  bookingId: string,
  sessionId: string,
): Promise<Booking> {
  const fields = await getFields();
  const result = await apiFetch<unknown>(`/api/bookings/${bookingId}/checkout/stripe/verify`, {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
  return normalizeBooking(result, fields);
}

export async function createPaypalOrder(
  bookingId: string,
): Promise<{ orderId: string }> {
  return apiFetch(`/api/bookings/${bookingId}/checkout/paypal`, { method: "POST" });
}

export async function capturePaypalPayment(
  bookingId: string,
  orderId: string,
): Promise<Booking> {
  const fields = await getFields();
  const result = await apiFetch<unknown>(`/api/bookings/${bookingId}/checkout/paypal/capture`, {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
  return normalizeBooking(result, fields);
}

export async function createMomoPayment(bookingId: string): Promise<{ payUrl: string }> {
  return apiFetch(`/api/bookings/${bookingId}/checkout/momo`, { method: "POST" });
}

export async function verifyMomoPayment(
  bookingId: string,
  params: Record<string, string>,
): Promise<Booking> {
  const fields = await getFields();
  const result = await apiFetch<unknown>(`/api/bookings/${bookingId}/checkout/momo/verify`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  return normalizeBooking(result, fields);
}

export async function createVnpayPayment(bookingId: string): Promise<{ payUrl: string }> {
  return apiFetch(`/api/bookings/${bookingId}/checkout/vnpay`, { method: "POST" });
}

export async function verifyVnpayPayment(
  bookingId: string,
  params: Record<string, string>,
): Promise<Booking> {
  const fields = await getFields();
  const result = await apiFetch<unknown>(`/api/bookings/${bookingId}/checkout/vnpay/verify`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  return normalizeBooking(result, fields);
}

export async function createZalopayOrder(bookingId: string): Promise<{ payUrl: string }> {
  return apiFetch(`/api/bookings/${bookingId}/checkout/zalopay`, { method: "POST" });
}

export async function verifyZalopayOrder(
  bookingId: string,
): Promise<Booking | { pending: true; message: string }> {
  const result = await apiFetch<unknown>(`/api/bookings/${bookingId}/checkout/zalopay/verify`, {
    method: "POST",
  });
  if (typeof result === "object" && result !== null && "pending" in result) {
    return result as { pending: true; message: string };
  }
  const fields = await getFields();
  return normalizeBooking(result, fields);
}

export async function joinMatch(
  booking1Id: string,
  booking2Id: string,
  startTime: string,
  endTime: string,
  fieldId: string,
): Promise<{ updatedBooking1: Booking; updatedBooking2: Booking }> {
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
