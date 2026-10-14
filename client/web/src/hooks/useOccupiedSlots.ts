"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { fieldDayRange, occupiedSlotLabels, type OccupiedSlot } from "@/lib/utils/reservations";
import { watchReservationChanges } from "@/lib/utils/reservationRefresh";

export function useOccupiedSlots(fieldId: string, date: string, open: string, close: string, timeZone: string) {
  const key = `${fieldId}:${date}:${open}:${close}:${timeZone}`;
  const [state, setState] = useState<{ key: string; slots: OccupiedSlot[]; error: string; loading: boolean }>({ key: "", slots: [], error: "", loading: true });
  const reload = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(() => reload.current(), []);
  useEffect(() => {
    let active = true, sequence = 0;
    if (!fieldId || !date) {
      setState({ key, slots: [], error: "", loading: false });
      reload.current = async () => {};
      return;
    }
    setState({ key, slots: [], error: "", loading: true });
    async function load() {
      const request = ++sequence;
      try {
        const range = fieldDayRange(date, open, close, timeZone);
        const query = new URLSearchParams({ fieldId, ...range });
        const slots = await apiFetch<OccupiedSlot[]>(`/api/bookings/occupied?${query}`, { cache: "no-store" });
        if (active && request === sequence) setState({ key, slots: occupiedSlotLabels(slots, date, range, timeZone), error: "", loading: false });
      } catch (error) {
        if (active && request === sequence) setState({ key, slots: [], error: error instanceof Error ? error.message : "Unable to load availability.", loading: false });
      }
    }
    reload.current = load;
    void load();
    const stopWatching = watchReservationChanges(() => { void load(); });
    return () => { active = false; stopWatching(); };
  }, [key, fieldId, date, open, close, timeZone]);
  return { ...(state.key === key ? state : { slots: [], error: "", loading: true }), refresh };
}
