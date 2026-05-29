"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CheckCircle2, Clock3, ListFilter, Search, UsersRound, XCircle } from "lucide-react";
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

const tabIcons = {
  all: ListFilter,
  upcoming: Clock3,
  pending: Search,
  confirmed: CheckCircle2,
  canceled: XCircle,
  matching: UsersRound,
} as const;

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
      <section className="hairline-panel rounded-[8px] p-6">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
          <CalendarCheck className="h-4 w-4" aria-hidden="true" />
          Schedule
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[0] text-neutral-950">
          My bookings
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Track reservations, matches, and cancellations.
        </p>
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <TabButton
            key={item.value}
            active={tab === item.value}
            icon={tabIcons[item.value]}
            label={item.label}
            onClick={() => setTab(item.value)}
          />
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

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof ListFilter;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-stone-200 bg-white/78 text-stone-600 hover:bg-white hover:text-neutral-950",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
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
