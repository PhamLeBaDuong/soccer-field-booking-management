"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarCheck, Check, Hash, MapPin, Navigation, UsersRound, X } from "lucide-react";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cancelBooking, confirmBooking } from "@/lib/api/bookings";
import { useRequireAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";
import { fieldDirectionsUrl } from "@/lib/utils/location";
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
  const directionsUrl = fieldDirectionsUrl(booking.field);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 hover:underline" href={ROUTES.bookings}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to bookings
      </Link>
      <section className="hairline-panel mt-4 flex flex-col gap-4 rounded-[8px] p-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-[0] text-neutral-950">
              {booking.field?.name ?? "Booking"}
            </h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-stone-600">
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            {formatDateRange(booking.startTime, booking.endTime)}
          </p>
        </div>
        <div className="flex gap-2">
          {booking.status === "pending" ? (
            <Button loading={actionLoading} onClick={confirmCurrentBooking}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Confirm
            </Button>
          ) : null}
          {canAct ? (
            <Button
              loading={actionLoading}
              variant="secondary"
              onClick={cancelCurrentBooking}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel
            </Button>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-neutral-950">Booking details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail icon={Hash} label="Booking ID" value={booking.id} />
              <Detail icon={UsersRound} label="Team size" value={String(booking.teamSize)} />
              <Detail icon={UsersRound} label="Need matching" value={booking.needMatching ? "Yes" : "No"} />
              <Detail
                icon={CalendarCheck}
                label="Total"
                value={formatCurrency(booking.totalPrice, booking.currency)}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-neutral-950">Timeline</h2>
            <div className="mt-5 space-y-4">
              {["Pending", "Confirmed", "Completed"].map((step, index) => (
                <div key={step} className="flex gap-3">
                  <span className="mt-1 h-3 w-3 rounded-full bg-neutral-950" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{step}</p>
                    <p className="text-xs text-stone-500">
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">Field</h2>
              <p className="mt-3 font-semibold text-neutral-950">
                {booking.field?.name ?? "Soccer field"}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-stone-500">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {booking.field?.address ?? booking.field?.complex?.name ?? "Address unavailable"}
              </p>
            </div>
            {directionsUrl ? (
              <a
                className={buttonClasses("primary", "md", "shrink-0")}
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Get directions
              </a>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] bg-stone-50 p-4 ring-1 ring-stone-200/70">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-sm text-neutral-950">{value}</p>
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
