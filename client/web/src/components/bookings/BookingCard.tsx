"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarCheck, MapPin, Search, UsersRound, X } from "lucide-react";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Booking } from "@/lib/types";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const stripeClasses: Record<Booking["status"], string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-amber-500",
  canceled: "bg-red-500",
  matching: "bg-sky-500",
};

export function BookingCard({
  booking,
  onCancel,
  onFindMatch,
}: {
  booking: Booking;
  onCancel?: (bookingId: string) => Promise<void>;
  onFindMatch?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  async function handleCancel() {
    if (!onCancel) {
      return;
    }
    setLoading(true);
    try {
      await onCancel(booking.id);
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden transition duration-300 hover:shadow-[0_24px_64px_rgba(23,23,23,0.1)]">
      <div className="flex">
        <div className={cn("w-1.5 shrink-0", stripeClasses[booking.status])} />
        <div className="flex flex-1 flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-neutral-950">
                {booking.field?.name ?? "Soccer field"}
              </h2>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {booking.field?.complex?.name ?? booking.field?.address ?? "Field booking"}
            </p>
            <p className="mt-3 flex items-center gap-1.5 font-mono text-sm text-neutral-700">
              <CalendarCheck className="h-4 w-4 text-stone-500" aria-hidden="true" />
              {formatDateRange(booking.startTime, booking.endTime)}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              Team size: {booking.teamSize}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="font-mono text-xl font-semibold text-neutral-950">
              {formatCurrency(booking.totalPrice, booking.currency)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                className={buttonClasses("secondary", "sm")}
                href={`/bookings/${booking.id}`}
              >
                View Details
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {booking.needMatching ? (
                <Button variant="secondary" size="sm" onClick={onFindMatch}>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Find Match
                </Button>
              ) : null}
              {canCancel && !confirming ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(true)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </Button>
              ) : null}
            </div>
            {confirming ? (
              <div className="flex items-center gap-2 rounded-[8px] bg-red-50 p-2 ring-1 ring-red-100">
                <span className="text-xs text-red-700">Cancel this booking?</span>
                <Button
                  variant="danger"
                  size="sm"
                  loading={loading}
                  onClick={handleCancel}
                >
                  Yes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirming(false)}
                >
                  No
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
