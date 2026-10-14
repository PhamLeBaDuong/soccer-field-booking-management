"use client";

import { useEffect, useMemo, useState } from "react";
import { slotHasStarted } from "@/lib/utils/reservations";
import { minutesToTime, timeToMinutes } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Slot = {
  start: number;
  end: number;
};

const SLOT_INTERVAL_MINUTES = 30;

function overlaps(slot: Slot, occupied: Slot): boolean {
  return slot.start < occupied.end && slot.end > occupied.start;
}

export function TimeSlotPicker({
  startTime,
  endTime,
  occupiedSlots,
  onRangeSelect,
  date,
  timeZone = "UTC",
}: {
  startTime: string;
  endTime: string;
  occupiedSlots: { startTime: string; endTime: string }[];
  onRangeSelect: (start: string, end: string) => void;
  date?: string;
  timeZone?: string;
}) {
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!date) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [date]);

  const occupied = useMemo(() => {
    const startMin = timeToMinutes(startTime);
    return occupiedSlots.map((slot) => {
      let s = timeToMinutes(slot.startTime);
      let e = timeToMinutes(slot.endTime);
      // Normalize after-midnight times for overnight fields
      if (s < startMin) s += 24 * 60;
      if (e < startMin) e += 24 * 60;
      return { start: s, end: e };
    });
  }, [occupiedSlots, startTime]);

  const slots = useMemo(() => {
    const start = timeToMinutes(startTime);
    let end = timeToMinutes(endTime);
    // Handle overnight fields where closing time wraps past midnight
    if (end <= start) end += 24 * 60;
    const next: Slot[] = [];
    for (let value = start; value < end; value += SLOT_INTERVAL_MINUTES) {
      next.push({ start: value, end: Math.min(value + SLOT_INTERVAL_MINUTES, end) });
    }
    return next;
  }, [endTime, startTime]);

  function isOccupied(slot: Slot): boolean {
    return slotHasStarted(slot.start, date, timeZone, now) || occupied.some((blocked) => overlaps(slot, blocked));
  }

  function hasBlockedRange(start: number, end: number): boolean {
    return slots
      .filter((slot) => slot.start >= start && slot.end <= end)
      .some(isOccupied);
  }

  useEffect(() => {
    if (selectedStart !== null && hasBlockedRange(selectedStart, selectedEnd ?? selectedStart + SLOT_INTERVAL_MINUTES)) {
      setSelectedStart(null);
      setSelectedEnd(null);
      onRangeSelect("", "");
    }
  }, [occupied, slots, date, timeZone, now, selectedStart, selectedEnd, onRangeSelect]);

  function selectSlot(slot: Slot) {
    if (isOccupied(slot)) {
      return;
    }

    if (selectedStart === null || selectedEnd !== null || slot.start <= selectedStart) {
      setSelectedStart(slot.start);
      setSelectedEnd(null);
      onRangeSelect(minutesToTime(slot.start), minutesToTime(slot.end));
      return;
    }

    if (hasBlockedRange(selectedStart, slot.end)) {
      setSelectedStart(slot.start);
      setSelectedEnd(null);
      onRangeSelect(minutesToTime(slot.start), minutesToTime(slot.end));
      return;
    }

    setSelectedEnd(slot.end);
    onRangeSelect(minutesToTime(selectedStart), minutesToTime(slot.end));
  }

  return (
    <>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((slot) => {
        const occupiedSlot = isOccupied(slot);
        const booked = occupied.some(blocked => overlaps(slot, blocked));
        const label = `${minutesToTime(slot.start)}-${minutesToTime(slot.end)}`;
        const reason = booked ? "Booked" : occupiedSlot ? "Time passed or unavailable local time" : "Available";
        const selected =
          selectedStart !== null &&
          slot.start >= selectedStart &&
          slot.end <= (selectedEnd ?? selectedStart + SLOT_INTERVAL_MINUTES);
        const startSelected = selectedStart === slot.start;

        return (
          <button
            key={slot.start}
            type="button"
            disabled={occupiedSlot}
            title={reason}
            aria-label={`${label}: ${reason}`}
            onClick={() => selectSlot(slot)}
            className={cn(
              "rounded-[8px] border px-3 py-2 text-sm font-semibold transition-all",
              "focus:outline-none focus:ring-2 focus:ring-green-700",
              occupiedSlot && "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400",
              occupiedSlot && "opacity-50",
              !occupiedSlot &&
                !selected &&
                "border-stone-200 bg-white/82 text-neutral-700 hover:border-green-700/40 hover:bg-emerald-50",
              selected && !occupiedSlot && "border-neutral-950 bg-neutral-950 text-white shadow-[0_10px_24px_rgba(23,23,23,0.14)]",
              startSelected && "ring-2 ring-amber-300",
            )}
          >
            {minutesToTime(slot.start)}-{minutesToTime(slot.end)}
          </button>
        );
      })}
    </div>
    {slots.length > 0 && slots.every(isOccupied) && <p role="status" className="mt-2 text-sm text-stone-600">{slots.every(slot => slotHasStarted(slot.start, date, timeZone, now)) ? "No future slots on this date. Choose a later date." : "No available slots on this date. Choose another date."}</p>}
    <p className="mt-2 text-xs text-stone-500">Greyed out: unavailable</p>
    </>
  );
}
