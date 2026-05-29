"use client";

import { useMemo, useState } from "react";
import { minutesToTime, timeToMinutes } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Slot = {
  start: number;
  end: number;
};

function overlaps(slot: Slot, occupied: Slot): boolean {
  return slot.start < occupied.end && slot.end > occupied.start;
}

export function TimeSlotPicker({
  startTime,
  endTime,
  occupiedSlots,
  onRangeSelect,
}: {
  startTime: string;
  endTime: string;
  occupiedSlots: { startTime: string; endTime: string }[];
  onRangeSelect: (start: string, end: string) => void;
}) {
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null);

  const occupied = useMemo(
    () =>
      occupiedSlots.map((slot) => ({
        start: timeToMinutes(slot.startTime),
        end: timeToMinutes(slot.endTime),
      })),
    [occupiedSlots],
  );

  const slots = useMemo(() => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const next: Slot[] = [];
    for (let value = start; value < end; value += 60) {
      next.push({ start: value, end: Math.min(value + 60, end) });
    }
    return next;
  }, [endTime, startTime]);

  function isOccupied(slot: Slot): boolean {
    return occupied.some((blocked) => overlaps(slot, blocked));
  }

  function hasBlockedRange(start: number, end: number): boolean {
    return slots
      .filter((slot) => slot.start >= start && slot.end <= end)
      .some(isOccupied);
  }

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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((slot) => {
        const occupiedSlot = isOccupied(slot);
        const selected =
          selectedStart !== null &&
          slot.start >= selectedStart &&
          slot.end <= (selectedEnd ?? selectedStart + 60);
        const startSelected = selectedStart === slot.start;

        return (
          <button
            key={slot.start}
            type="button"
            disabled={occupiedSlot}
            onClick={() => selectSlot(slot)}
            className={cn(
              "rounded-[8px] border px-3 py-2 text-sm font-semibold transition-all",
              "focus:outline-none focus:ring-2 focus:ring-green-700",
              occupiedSlot &&
                "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 line-through",
              !occupiedSlot &&
                !selected &&
                "border-stone-200 bg-white/82 text-neutral-700 hover:border-green-700/40 hover:bg-emerald-50",
              selected && "border-neutral-950 bg-neutral-950 text-white shadow-[0_10px_24px_rgba(23,23,23,0.14)]",
              startSelected && "ring-2 ring-amber-300",
            )}
          >
            {minutesToTime(slot.start)}-{minutesToTime(slot.end)}
          </button>
        );
      })}
    </div>
  );
}
