"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { BookingCard } from "@/components/bookings/BookingCard";
import { buttonClasses } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";
import { useBookings } from "@/hooks/useBookings";

function statLabel(value: number): string {
  return value.toLocaleString("en");
}

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, loading: authLoading } = useRequireAuth();
  const { bookings, loading, error, refresh, cancel } = useBookings(user?.id);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: bookings.length,
      upcoming: bookings.filter(
        (booking) =>
          new Date(booking.startTime).getTime() >= now &&
          booking.status !== "canceled",
      ).length,
      pending: bookings.filter((booking) => booking.status === "pending").length,
      canceled: bookings.filter((booking) => booking.status === "canceled").length,
    };
  }, [bookings]);

  const upcoming = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            new Date(booking.startTime).getTime() >= Date.now() &&
            booking.status !== "canceled",
        )
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        )
        .slice(0, 3),
    [bookings],
  );

  const recent = bookings.slice(0, 5);
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  async function handleCancel(bookingId: string) {
    await cancel(bookingId);
    showToast("Booking canceled.");
  }

  if (authLoading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-gray-500">{today}</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">
            Good morning, {user.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonClasses("primary")} href={ROUTES.fields}>
            Book a Field
          </Link>
          <Link className={buttonClasses("secondary")} href={ROUTES.matching}>
            Find a Match
          </Link>
        </div>
      </div>

      {error ? <div className="mt-6"><ErrorState message={error} onRetry={refresh} /></div> : null}

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Total Bookings", stats.total],
          ["Upcoming", stats.upcoming],
          ["Pending", stats.pending],
          ["Canceled", stats.canceled],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-3 font-mono text-3xl font-semibold text-gray-900">
                {statLabel(Number(value))}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming bookings</h2>
          <Link className="text-sm font-medium text-green-700" href={ROUTES.bookings}>
            View all
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : upcoming.length ? (
          <div className="grid gap-4">
            {upcoming.map((booking) => (
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
            icon={<span className="text-lg">+</span>}
            title="No upcoming bookings"
            description="Browse available pitches and reserve your next game."
            action={{ label: "Browse Fields", onClick: () => router.push(ROUTES.fields) }}
          />
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent activity</h2>
        <Card>
          <CardContent className="divide-y divide-gray-100 p-0">
            {recent.length ? (
              recent.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {booking.field?.name ?? "Soccer field"}
                    </p>
                    <p className="text-sm text-gray-500">{booking.status}</p>
                  </div>
                  <Link
                    className="text-sm font-medium text-green-700"
                    href={`/bookings/${booking.id}`}
                  >
                    Open
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-6 text-sm text-gray-500">No recent bookings.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-64" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="mt-8 h-40" />
      <Skeleton className="mt-4 h-40" />
    </div>
  );
}

