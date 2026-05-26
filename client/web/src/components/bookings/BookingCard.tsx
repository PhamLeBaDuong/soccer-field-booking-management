"use client";

import Link from "next/link";
import { useState } from "react";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Booking } from "@/lib/types";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const stripeClasses: Record<Booking["status"], string> = {
  confirmed: "bg-green-500",
  pending: "bg-amber-500",
  canceled: "bg-red-500",
  matching: "bg-blue-500",
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
    <Card className="overflow-hidden">
      <div className="flex">
        <div className={cn("w-1.5 shrink-0", stripeClasses[booking.status])} />
        <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-gray-900">
                {booking.field?.name ?? "Soccer field"}
              </h2>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {booking.field?.complex?.name ?? booking.field?.address ?? "Field booking"}
            </p>
            <p className="mt-2 font-mono text-sm text-gray-700">
              {formatDateRange(booking.startTime, booking.endTime)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Team size: {booking.teamSize}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="font-mono text-lg font-semibold text-green-700">
              {formatCurrency(booking.totalPrice, booking.currency)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                className={buttonClasses("secondary", "sm")}
                href={`/bookings/${booking.id}`}
              >
                View Details
              </Link>
              {booking.needMatching ? (
                <Button variant="secondary" size="sm" onClick={onFindMatch}>
                  Find Match
                </Button>
              ) : null}
              {canCancel && !confirming ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(true)}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
            {confirming ? (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2">
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

