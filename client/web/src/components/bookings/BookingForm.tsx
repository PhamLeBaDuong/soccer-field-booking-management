"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, DoorOpen } from "lucide-react";
import { TimeSlotPicker } from "@/components/fields/TimeSlotPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createBooking } from "@/lib/api/bookings";
import { createLobby } from "@/lib/api/lobbies";
import { useAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";
import type { Field } from "@/lib/types";
import {
  combineDateAndTime,
  durationHours,
  formatCurrency,
  timeToMinutes,
  todayInputValue,
} from "@/lib/utils/format";

function fieldTeamSize(field: Field): number {
  const side = Number.parseInt(field.type, 10);
  return Number.isNaN(side) ? 10 : side * 2;
}

export function BookingForm({ field }: { field: Field }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [date, setDate] = useState(todayInputValue());
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  // const [numPlayers, setNumPlayers] = useState("1"); // Legacy player-count input.
  const [openLobby, setOpenLobby] = useState(false);
  const [dateError, setDateError] = useState("");
  const [timeError, setTimeError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If the selected end time wraps past midnight (overnight field), use the next calendar day
  const endDate  = start && end && timeToMinutes(end) < timeToMinutes(start)
    ? (() => { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + 1); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-"); })()
    : date;
  const startIso = start ? combineDateAndTime(date, start) : "";
  const endIso   = end   ? combineDateAndTime(endDate, end) : "";
  const hours    = startIso && endIso ? durationHours(startIso, endIso) : 0;
  const total    = hours * field.metadata.price;
  const teamSize = fieldTeamSize(field);

  function handleDateChange(value: string) {
    setDate(value);
    setStart("");
    setEnd("");
    setTimeError("");
    const today = todayInputValue();
    setDateError(value < today ? "Date cannot be in the past." : "");
  }

  function handleRangeSelect(s: string, e: string) {
    setStart(s);
    setEnd(e);
    // Legacy rejected legitimate overnight ranges from the slot picker.
    if (s && e && s === e) {
      setTimeError("End time must be after start time.");
    } else {
      setTimeError("");
    }
  }

  async function submit() {
    if (!user) { router.push(ROUTES.login); return; }
    if (dateError) { setError(dateError); return; }
    if (!start || !end) { setError("Choose a time slot."); return; }
    if (timeError) { setError(timeError); return; }

// Legacy implementation retained for review; no longer executed.
//     const n = Number(numPlayers);
//     if (n < 1 || n > teamSize) {
//       setError(`Number of players must be between 1 and ${teamSize}.`); return;
//     }
//
//
    setLoading(true);
    setError("");
    try {
// Legacy implementation retained for review; no longer executed.
//       await createLobby({
//         fieldId:     field.id,
//         startTime:   startIso,
//         endTime:     endIso,
//         teamSize,
//         initialSize: n,
//         visibility:  openLobby ? "public" : "private",
//       });
//       showToast(openLobby ? "Lobby created — others can join!" : "Slot reserved.");
//       router.push(ROUTES.lobbies);
      if (openLobby) {
        await createLobby({ fieldId: field.id, startTime: startIso, endTime: endIso,
          teamSize, initialSize: 1, visibility: "public" });
        showToast("Lobby created ? your booking confirms when it fills.");
        router.push(ROUTES.lobbies);
      } else {
        const booking = await createBooking({ fieldId: field.id, startTime: startIso, endTime: endIso });
        showToast("Booking confirmed.");
        router.push("/bookings/" + booking.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reserve this slot.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Input
        label="Date"
        type="date"
        leadingIcon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
        value={date}
        min={todayInputValue()}
        error={dateError}
        onChange={(e) => handleDateChange(e.target.value)}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-900">Time slot</span>
          <span className="text-xs font-medium text-stone-500">30-minute slots</span>
        </div>
        <TimeSlotPicker
          key={`${field.id}:${date}`}
          startTime={field.startTime}
          endTime={field.endTime}
          occupiedSlots={field.occupiedTimes ?? []}
          onRangeSelect={handleRangeSelect}
        />
        {start && end && !timeError && (
          <p className="mt-2 text-xs font-medium text-stone-500">
            Selected: {start} – {end} ({hours} hr)
          </p>
        )}
        {timeError && (
          <p className="mt-2 text-xs font-medium text-red-600">{timeError}</p>
        )}
      </div>

      {/* Legacy player-count input, retained for review:
      <Input
        label="Initial number of players"
        type="number"
        min={1}
        max={teamSize}
        leadingIcon={<UsersRound className="h-4 w-4" aria-hidden="true" />}
        value={numPlayers}
        onChange={(e) => setNumPlayers(e.target.value)}
      />
      */}

      <label className="flex cursor-pointer items-start gap-3 rounded-[8px] border border-stone-200 bg-white/72 p-3 transition-colors hover:bg-stone-50">
        <input
          className="mt-1 h-4 w-4 rounded border-stone-300 accent-neutral-950"
          type="checkbox"
          checked={openLobby}
          onChange={(e) => setOpenLobby(e.target.checked)}
        />
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
            <DoorOpen className="h-4 w-4 text-stone-500" aria-hidden="true" />
            Open lobby for others to join
          </span>
          <span className="text-xs text-stone-500">
            {/* Legacy: A match forms when both sides are full. */}
            Other players can join. Everyone receives a booking when the lobby is full.
          </span>
        </span>
      </label>

      <div className="rounded-[8px] border border-stone-200 bg-stone-50/80 p-4">
        <div className="flex justify-between text-sm text-stone-600">
          <span>Duration</span>
          <span className="font-mono">{hours || 0} hr</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-stone-600">
          <span>Hourly rate</span>
          <span className="font-mono">{formatCurrency(field.metadata.price, field.metadata.currency)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 font-semibold text-neutral-950">
          <span>Total</span>
          <span className="font-mono">{formatCurrency(total, field.metadata.currency)}</span>
        </div>
      </div>

      {error && (
        <p className="rounded-[8px] bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{error}</p>
      )}

      <Button className="w-full" loading={loading} onClick={submit}>
        <Check className="h-4 w-4" aria-hidden="true" />
        {openLobby ? "Create lobby" : "Book field"}
      </Button>
    </div>
  );
}
