"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { fieldDayRange, occupiedSlotLabels, type OccupiedSlot } from "@/lib/utils/reservations";

export function useOccupiedSlots(fieldId: string, date: string, open: string, close: string, timeZone: string) {
  const key = `${fieldId}:${date}:${open}:${close}:${timeZone}`;
  const [state, setState] = useState<{ key: string; slots: OccupiedSlot[]; error: string; loading: boolean }>({ key: "", slots: [], error: "", loading: true });
  useEffect(() => {
    let active = true;
    setState({ key, slots: [], error: "", loading: true });
    async function load() {
      try {
        const range = fieldDayRange(date, open, close, timeZone);
        const query = new URLSearchParams({ fieldId, ...range });
        const slots = await apiFetch<OccupiedSlot[]>(`/api/bookings/occupied?${query}`);
        if (active) setState({ key, slots: occupiedSlotLabels(slots, date, range, timeZone), error: "", loading: false });
      } catch (error) {
        if (active) setState({ key, slots: [], error: error instanceof Error ? error.message : "Unable to load availability.", loading: false });
      }
    }
    void load();
    return () => { active = false; };
  }, [key, fieldId, date, open, close, timeZone]);
  return state.key === key ? state : { slots: [], error: "", loading: true };
}
