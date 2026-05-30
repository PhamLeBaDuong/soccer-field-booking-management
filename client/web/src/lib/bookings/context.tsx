"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Booking } from "@/lib/types";

type BookingsContextValue = {
  extraBookings: Booking[];
  addBookings: (bookings: Booking[]) => void;
};

const BookingsContext = createContext<BookingsContextValue>({
  extraBookings: [],
  addBookings: () => {},
});

export function BookingsProvider({ children }: { children: ReactNode }) {
  const [extraBookings, setExtraBookings] = useState<Booking[]>([]);

  const addBookings = useCallback((bookings: Booking[]) => {
    setExtraBookings((prev) => {
      // De-duplicate by id in case the same booking is added twice
      const existingIds = new Set(prev.map((b) => b.id));
      const fresh = bookings.filter((b) => !existingIds.has(b.id));
      return [...fresh, ...prev];
    });
  }, []);

  const value = useMemo(
    () => ({ extraBookings, addBookings }),
    [extraBookings, addBookings],
  );

  return (
    <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>
  );
}

export function useBookingsContext() {
  return useContext(BookingsContext);
}
