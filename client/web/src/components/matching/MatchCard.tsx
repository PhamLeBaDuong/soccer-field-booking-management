"use client";

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
    <Card>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {booking.field?.complex?.name ?? "Open match"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-900">
            {booking.field?.name ?? "Soccer field"}
          </h2>
          <p className="mt-2 font-mono text-sm text-gray-700">
            {formatDateRange(booking.startTime, booking.endTime)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Looking for a {booking.teamSize}v{booking.teamSize} team
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
          <div className="text-right">
            <p className="font-mono text-lg font-semibold text-green-700">
              {formatCurrency(booking.totalPrice / 2, booking.currency)}
            </p>
            <p className="text-xs text-gray-500">estimated per team</p>
          </div>
          <Button loading={loading} onClick={() => onJoin(booking)}>
            Join Match
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

