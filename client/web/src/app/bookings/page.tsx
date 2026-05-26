"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookingCard } from "@/components/bookings/BookingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";
import type { Booking, BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useBookings } from "@/hooks/useBookings";

type BookingTab = "all" | "upcoming" | BookingStatus;

const tabs: { label: string; value: BookingTab }[] = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Canceled", value: "canceled" },
];

export default function BookingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, loading: authLoading } = useRequireAuth();
  const { bookings, loading, error, refresh, cancel } = useBookings(user?.id);
  const [tab, setTab] = useState<BookingTab>("all");

  const filtered = useMemo(() => filterBookings(bookings, tab), [bookings, tab]);

  async function handleCancel(bookingId: string) {
    await cancel(bookingId);
    showToast("Booking canceled.");
  }

  if (authLoading || !user) {
    return <BookingsSkeleton />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My bookings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track reservations, matches, and cancellations.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.value}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-2 text-sm font-medium",
              tab === item.value
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            )}
            onClick={() => setTab(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {error ? <ErrorState message={error} onRetry={refresh} /> : null}
        {loading ? (
          <div className="grid gap-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        ) : filtered.length ? (
          <div className="grid gap-4">
            {filtered.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                onFindMatch={() => router.push(ROUTES.matching)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<span className="text-lg">0</span>}
            title="No bookings here"
            description="This tab is empty right now."
            action={{
              label: "Book a Field",
              onClick: () => router.push(ROUTES.fields),
            }}
          />
        )}
      </div>
    </div>
  );
}

function filterBookings(bookings: Booking[], tab: BookingTab): Booking[] {
  if (tab === "all") {
    return bookings;
  }

  if (tab === "upcoming") {
    return bookings.filter(
      (booking) =>
        new Date(booking.startTime).getTime() >= Date.now() &&
        booking.status !== "canceled",
    );
  }

  return bookings.filter((booking) => booking.status === tab);
}

function BookingsSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-6 h-12" />
      <Skeleton className="mt-6 h-36" />
      <Skeleton className="mt-4 h-36" />
    </div>
  );
}

