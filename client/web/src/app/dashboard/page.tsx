"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  Clock3,
  Search,
  Sparkles,
  Trophy,
  UsersRound,
  XCircle,
} from "lucide-react";
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="pitch-hero-bg reveal-up overflow-hidden rounded-[8px] px-5 py-8 text-white shadow-[0_30px_90px_rgba(23,23,23,0.18)] sm:px-8 lg:px-10 lg:py-10">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86 ring-1 ring-white/18 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {today}
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[0] text-white sm:text-5xl">
            Good morning, {user.name}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/76">
            Your next match, field, and team plan in one quiet command center.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className={buttonClasses("secondary", "lg", "bg-white text-neutral-950 hover:bg-white/92")} href={ROUTES.fields}>
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              Book a Field
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link className={buttonClasses("ghost", "lg", "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/16")} href={ROUTES.matching}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Find a Match
            </Link>
          </div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat icon={Trophy} label="Total" value={stats.total} />
          <HeroStat icon={Clock3} label="Upcoming" value={stats.upcoming} />
          <HeroStat icon={UsersRound} label="Pending" value={stats.pending} />
          <HeroStat icon={XCircle} label="Canceled" value={stats.canceled} />
        </div>
      </section>

      {error ? <div className="mt-6"><ErrorState message={error} onRetry={refresh} /></div> : null}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-stone-500">Next up</p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-950">Upcoming bookings</h2>
          </div>
          <Link className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-900 hover:underline" href={ROUTES.bookings}>
            View all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
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

      <section className="mt-8 pb-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase text-stone-500">Log</p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-950">Recent activity</h2>
        </div>
        <Card>
          <CardContent className="divide-y divide-stone-100 p-0">
            {recent.length ? (
              recent.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-stone-50/70"
                >
                  <div>
                    <p className="font-semibold text-neutral-950">
                      {booking.field?.name ?? "Soccer field"}
                    </p>
                    <p className="text-sm capitalize text-stone-500">{booking.status}</p>
                  </div>
                  <Link
                    className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-900 hover:underline"
                    href={`/bookings/${booking.id}`}
                  >
                    Open
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-6 text-sm text-stone-500">No recent bookings.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[8px] border border-white/14 bg-white/12 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white/70">{label}</p>
        <Icon className="h-4 w-4 text-white/70" aria-hidden="true" />
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold text-white">
        {statLabel(value)}
      </p>
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
