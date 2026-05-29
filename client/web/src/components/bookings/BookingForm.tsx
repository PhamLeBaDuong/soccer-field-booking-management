"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, UsersRound } from "lucide-react";
import { TimeSlotPicker } from "@/components/fields/TimeSlotPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createBooking } from "@/lib/api/bookings";
import { useAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";
import type { Field } from "@/lib/types";
import {
  combineDateAndTime,
  durationHours,
  formatCurrency,
  todayInputValue,
} from "@/lib/utils/format";

export function BookingForm({ field }: { field: Field }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [date, setDate] = useState(todayInputValue());
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [teamSize, setTeamSize] = useState("5");
  const [needMatching, setNeedMatching] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startIso = start ? combineDateAndTime(date, start) : "";
  const endIso = end ? combineDateAndTime(date, end) : "";
  const hours = startIso && endIso ? durationHours(startIso, endIso) : 0;
  const total = hours * field.metadata.price;

  async function submitBooking() {
    if (!user) {
      router.push(ROUTES.login);
      return;
    }

    if (!start || !end) {
      setError("Choose an available time slot.");
      return;
    }

    if (Number(teamSize) < 2) {
      setError("Team size must be at least 2.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const booking = await createBooking({
        userId: user.id,
        fieldId: field.id,
        startTime: startIso,
        endTime: endIso,
        needMatching,
        teamSize: Number(teamSize),
        fieldPrice: field.metadata.price,
        currency: field.metadata.currency ?? "VND",
      });
      showToast("Booking created.");
      router.push(`/bookings/${booking.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create booking.",
      );
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
        onChange={(event) => setDate(event.target.value)}
      />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-900">Time slot</span>
          <span className="text-xs font-medium text-stone-500">1-hour slots</span>
        </div>
        <TimeSlotPicker
          startTime={field.startTime}
          endTime={field.endTime}
          occupiedSlots={field.occupiedTimes ?? []}
          onRangeSelect={(nextStart, nextEnd) => {
            setStart(nextStart);
            setEnd(nextEnd);
          }}
        />
      </div>
      <Input
        label="Team size"
        type="number"
        min={2}
        leadingIcon={<UsersRound className="h-4 w-4" aria-hidden="true" />}
        value={teamSize}
        onChange={(event) => setTeamSize(event.target.value)}
      />
      <label className="flex items-start gap-3 rounded-[8px] border border-stone-200 bg-white/72 p-3">
        <input
          className="mt-1 h-4 w-4 rounded border-stone-300 accent-neutral-950"
          type="checkbox"
          checked={needMatching}
          onChange={(event) => setNeedMatching(event.target.checked)}
        />
        <span>
          <span className="block text-sm font-semibold text-neutral-950">
            Need matching?
          </span>
          <span className="text-xs text-stone-500">
            We will find another team to share the booking cost.
          </span>
        </span>
      </label>
      <div className="rounded-[8px] border border-stone-200 bg-stone-50/80 p-4">
        <div className="flex justify-between text-sm text-stone-600">
          <span>Duration</span>
          <span className="font-mono">{hours || 0} hr</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-stone-600">
          <span>Rate</span>
          <span className="font-mono">
            {formatCurrency(field.metadata.price, field.metadata.currency)}
          </span>
        </div>
        <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 font-semibold text-neutral-950">
          <span>Total</span>
          <span className="font-mono">
            {formatCurrency(total, field.metadata.currency)}
          </span>
        </div>
      </div>
      {error ? (
        <p className="rounded-[8px] bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{error}</p>
      ) : null}
      <Button className="w-full" loading={loading} onClick={submitBooking}>
        <Check className="h-4 w-4" aria-hidden="true" />
        Book Now
      </Button>
    </div>
  );
}
