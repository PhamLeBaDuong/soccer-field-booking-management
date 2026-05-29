"use client";

import { CalendarClock, MapPin, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import type { Booking } from "@/lib/types";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";

export function MatchCard({
  booking,
  onJoin,
  loading,
}: {
  booking: Booking;
  onJoin: (booking: Booking) => void;
  loading?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-stone-500">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {booking.field?.complex?.name ?? "Open match"}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-neutral-950">
            {booking.field?.name ?? "Soccer field"}
          </h2>
          <p className="mt-3 flex items-center gap-1.5 font-mono text-sm text-neutral-700">
            <CalendarClock className="h-4 w-4 text-stone-500" aria-hidden="true" />
            {formatDateRange(booking.startTime, booking.endTime)}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            Looking for a {booking.teamSize}v{booking.teamSize} team
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
          <div className="text-right">
            <p className="font-mono text-xl font-semibold text-neutral-950">
              {formatCurrency(booking.totalPrice / 2, booking.currency)}
            </p>
            <p className="text-xs text-stone-500">estimated per team</p>
          </div>
          <Button loading={loading} onClick={() => onJoin(booking)}>
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            Join Match
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
