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
        (b) => new Date(b.startTime).getTime() >= now && b.status !== "canceled",
      ).length,
      pending: bookings.filter((b) => b.status === "pending").length,
      canceled: bookings.filter((b) => b.status === "canceled").length,
    };
  }, [bookings]);

  const upcoming = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            new Date(b.startTime).getTime() >= Date.now() && b.status !== "canceled",
        )
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
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
      {/* Hero */}
      <section className="pitch-hero-bg reveal-up overflow-hidden rounded-[12px] px-6 py-10 text-white shadow-[0_4px_24px_rgba(0,0,0,0.14),0_24px_80px_rgba(0,0,0,0.18)] sm:px-10 lg:px-12 lg:py-14">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/16 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {today}
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
            Good morning, {user.name}
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-white/68">
            Your next match, field, and team plan — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className={buttonClasses(
                "secondary",
                "lg",
                "bg-white text-neutral-950 shadow-[0_1px_2px_rgba(0,0,0,0.14),0_8px_24px_rgba(0,0,0,0.10)] hover:bg-white/94",
              )}
              href={ROUTES.fields}
            >
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              Book a Field
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              className={buttonClasses(
                "ghost",
                "lg",
                "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/16 hover:ring-white/30",
              )}
              href={ROUTES.matching}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Find a Match
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat icon={Trophy}      label="Total"    value={stats.total} />
          <HeroStat icon={Clock3}      label="Upcoming" value={stats.upcoming} />
          <HeroStat icon={UsersRound}  label="Pending"  value={stats.pending} />
          <HeroStat icon={XCircle}     label="Canceled" value={stats.canceled} />
        </div>
      </section>

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      ) : null}

      {/* Upcoming bookings */}
      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              Next up
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-neutral-950">
              Upcoming bookings
            </h2>
          </div>
          <Link
            className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-700 transition-colors hover:text-neutral-950"
            href={ROUTES.bookings}
          >
            View all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : upcoming.length ? (
          <div className="grid gap-3">
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
            icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
            title="No upcoming bookings"
            description="Browse available pitches and reserve your next game."
            action={{ label: "Browse Fields", onClick: () => router.push(ROUTES.fields) }}
          />
        )}
      </section>

      {/* Recent activity */}
      <section className="mt-10 pb-10">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Activity
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-neutral-950">
            Recent bookings
          </h2>
        </div>
        <Card>
          <CardContent className="divide-y divide-stone-100 p-0">
            {recent.length ? (
              recent.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-stone-50/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-950">
                      {booking.field?.name ?? "Soccer field"}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-stone-500">{booking.status}</p>
                  </div>
                  <Link
                    className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-neutral-700 transition-colors hover:text-neutral-950"
                    href={`/bookings/${booking.id}`}
                  >
                    Open
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="px-5 py-6 text-sm text-stone-400">No recent bookings.</div>
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
    <div className="rounded-[8px] border border-white/12 bg-white/10 p-4 backdrop-blur-sm transition-colors hover:bg-white/14">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
        <Icon className="h-4 w-4 text-white/50" aria-hidden="true" />
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-[-0.03em] text-white">
        {statLabel(value)}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-64 rounded-[12px]" />
      <div className="mt-10">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-7 w-56" />
        <div className="mt-5 grid gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    </div>
  );
}
