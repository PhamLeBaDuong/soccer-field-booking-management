"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelBooking,
  getBookingById,
  getUserBookings,
} from "@/lib/api/bookings";
import { useBookingsContext } from "@/lib/bookings/context";
import type { Booking } from "@/lib/types";

export function useBookings(userId?: string): {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  cancel: (bookingId: string) => Promise<void>;
} {
  const { extraBookings } = useBookingsContext();
  const [apiBookings, setApiBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setApiBookings(await getUserBookings(userId));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load bookings.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const cancel = useCallback(async (bookingId: string) => {
    const updated = await cancelBooking(bookingId);
    setApiBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId ? { ...booking, ...updated } : booking,
      ),
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Merge: extra (in-session optimistic) bookings appear first.
  // Drop an optimistic booking once the real one arrives from the API — matching
  // either by id OR by natural key (field + time slot), since the optimistic
  // booking carries a synthetic id that never equals the server UUID.
  const bookings = useMemo(() => {
    const userExtra = userId
      ? extraBookings.filter((b) => b.userId === userId)
      : [];

    const slotKey = (b: Booking) =>
      `${b.fieldId}|${new Date(b.startTime).getTime()}|${new Date(b.endTime).getTime()}`;

    const apiIds   = new Set(apiBookings.map((b) => b.id));
    const apiSlots = new Set(apiBookings.map(slotKey));

    const freshExtra = userExtra.filter(
      (b) => !apiIds.has(b.id) && !apiSlots.has(slotKey(b)),
    );
    return [...freshExtra, ...apiBookings];
  }, [extraBookings, apiBookings, userId]);

  return { bookings, loading, error, refresh, cancel };
}

export function useBooking(bookingId: string | null): {
  booking: Booking | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!bookingId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setBooking(await getBookingById(bookingId));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load booking.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { booking, loading, error, refresh };
}
