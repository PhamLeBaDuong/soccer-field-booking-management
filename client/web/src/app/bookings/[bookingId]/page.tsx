"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cancelBooking, confirmBooking } from "@/lib/api/bookings";
import { useRequireAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";
import { useBooking } from "@/hooks/useBookings";

export default function BookingDetailPage() {
  const params = useParams<{ bookingId: string }>();
  const { loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();
  const { booking, loading, error, refresh } = useBooking(params.bookingId);
  const [actionLoading, setActionLoading] = useState(false);

  async function cancelCurrentBooking() {
    if (!booking) {
      return;
    }

    setActionLoading(true);
    try {
      await cancelBooking(booking.id);
      showToast("Booking canceled.");
      await refresh();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Unable to cancel booking.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmCurrentBooking() {
    if (!booking) {
      return;
    }

    setActionLoading(true);
    try {
      await confirmBooking(booking.id, booking.startTime, booking.endTime);
      showToast("Booking confirmed.");
      await refresh();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Unable to confirm booking.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (authLoading || loading) {
    return <BookingDetailSkeleton />;
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorState message={error ?? "Booking not found."} onRetry={refresh} />
      </div>
    );
  }

  const canAct = booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link className="text-sm font-medium text-green-700" href={ROUTES.bookings}>
        Back to bookings
      </Link>
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              {booking.field?.name ?? "Booking"}
            </h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-2 font-mono text-gray-600">
            {formatDateRange(booking.startTime, booking.endTime)}
          </p>
        </div>
        <div className="flex gap-2">
          {booking.status === "pending" ? (
            <Button loading={actionLoading} onClick={confirmCurrentBooking}>
              Confirm
            </Button>
          ) : null}
          {canAct ? (
            <Button
              loading={actionLoading}
              variant="secondary"
              onClick={cancelCurrentBooking}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-gray-900">Booking details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label="Booking ID" value={booking.id} />
              <Detail label="Team size" value={String(booking.teamSize)} />
              <Detail label="Need matching" value={booking.needMatching ? "Yes" : "No"} />
              <Detail
                label="Total"
                value={formatCurrency(booking.totalPrice, booking.currency)}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
            <div className="mt-5 space-y-4">
              {["Pending", "Confirmed", "Completed"].map((step, index) => (
                <div key={step} className="flex gap-3">
                  <span className="mt-1 h-3 w-3 rounded-full bg-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{step}</p>
                    <p className="text-xs text-gray-500">
                      {index === 0 ? "Created" : "Status checkpoint"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent>
          <h2 className="text-lg font-semibold text-gray-900">Field</h2>
          <p className="mt-3 font-medium text-gray-900">
            {booking.field?.name ?? "Soccer field"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {booking.field?.complex?.name ?? booking.field?.address ?? "Address unavailable"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-2 break-words font-mono text-sm text-gray-900">{value}</p>
    </div>
  );
}

function BookingDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-6 h-64" />
      <Skeleton className="mt-6 h-40" />
    </div>
  );
}

