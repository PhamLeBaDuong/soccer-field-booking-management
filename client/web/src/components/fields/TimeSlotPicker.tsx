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
              "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-green-500",
              occupiedSlot &&
                "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through",
              !occupiedSlot &&
                !selected &&
                "border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50",
              selected && "border-green-600 bg-green-100 text-green-800",
              startSelected && "ring-2 ring-blue-400",
            )}
          >
            {minutesToTime(slot.start)}-{minutesToTime(slot.end)}
          </button>
        );
      })}
    </div>
  );
}

