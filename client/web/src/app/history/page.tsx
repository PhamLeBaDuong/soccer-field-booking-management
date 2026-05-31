"use client";

import { useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  History,
  Swords,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/lib/auth/hooks";
import { useBookings } from "@/hooks/useBookings";
import { useMatches } from "@/hooks/useMatches";
import type { Booking, Match } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";

type Tab = "bookings" | "matches";

export default function HistoryPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { bookings, loading: bookingsLoading, error: bookingsError, refresh: refreshBookings } = useBookings(user?.id);
  const { matches,  loading: matchesLoading,  error: matchesError,  refresh: refreshMatches  } = useMatches();

  const [tab, setTab] = useState<Tab>("bookings");

  if (authLoading || !user) return <HistorySkeleton />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="hairline-panel rounded-[8px] p-6">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
          <History className="h-4 w-4" aria-hidden="true" />
          Activity
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[0] text-neutral-950">History</h1>
        <p className="mt-2 text-sm text-stone-500">
          Your complete booking record and match results.
        </p>
      </section>

      {/* Tabs */}
      <div className="mt-6 flex gap-2">
        <TabButton active={tab === "bookings"} icon={CalendarCheck} label="Bookings" onClick={() => setTab("bookings")} />
        <TabButton active={tab === "matches"}  icon={Swords}        label="Matches"  onClick={() => setTab("matches")}  />
      </div>

      <div className="mt-6">
        {tab === "bookings" ? (
          bookingsError ? (
            <ErrorState message={bookingsError} onRetry={refreshBookings} />
          ) : bookingsLoading ? (
            <LoadingRows />
          ) : bookings.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No bookings yet" description="Book a field to see your history here." />
          ) : (
            <div className="grid gap-3">
              {bookings.map((b) => <BookingRow key={b.id} booking={b} />)}
            </div>
          )
        ) : (
          matchesError ? (
            <ErrorState message={matchesError} onRetry={refreshMatches} />
          ) : matchesLoading ? (
            <LoadingRows />
          ) : matches.length === 0 ? (
            <EmptyState icon={<Swords className="h-5 w-5" />} title="No matches yet" description="Post or accept a match request to see results here." />
          ) : (
            <div className="grid gap-3">
              {matches.map((m) => <MatchRow key={m.id} match={m} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Booking Row ──────────────────────────────────────────────────────────────

function BookingRow({ booking }: { booking: Booking }) {
  const isPast = new Date(booking.endTime) < new Date();
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-neutral-950">
                {booking.field?.name ?? "Field"}
              </span>
              <StatusBadge status={booking.status} />
              {isPast && booking.status !== "canceled" && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">Completed</span>
              )}
            </div>
            <p className="mt-1 font-mono text-sm text-stone-500">
              {formatDateRange(booking.startTime, booking.endTime)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-mono text-base font-semibold text-neutral-950">
              {formatCurrency(booking.totalPrice, booking.currency)}
            </p>
            <p className="text-xs text-stone-500">total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Match Row ────────────────────────────────────────────────────────────────

function MatchRow({ match }: { match: Match }) {
  const hasResult = match.homeScore !== null && match.awayScore !== null;
  const fieldName = match.field?.name
    ?? match.matchPost?.field?.name
    ?? "Field";
  const teamNames = match.matchPost
    ? `${match.matchPost.teamName} vs opponent`
    : "Lobby match";

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Swords className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
              <span className="text-base font-semibold text-neutral-950">{fieldName}</span>
              <MatchStatusBadge status={match.status} />
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold capitalize text-stone-600">
                {match.source}
              </span>
            </div>
            <p className="mt-1 font-mono text-sm text-stone-500">
              {formatDateRange(match.startTime, match.endTime)}
            </p>
            {match.matchPost && (
              <p className="mt-0.5 text-xs text-stone-400">{teamNames}</p>
            )}
          </div>

          {/* Result */}
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            {hasResult ? (
              <>
                <p className="font-mono text-2xl font-bold text-neutral-950">
                  {match.homeScore} – {match.awayScore}
                </p>
                {match.resultNote && (
                  <p className="text-xs text-stone-500">{match.resultNote}</p>
                )}
              </>
            ) : (
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-500">
                Result pending
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
      status === "confirmed" && "bg-emerald-50 text-emerald-800",
      status === "canceled"  && "bg-red-50 text-red-700",
      status === "pending"   && "bg-amber-50 text-amber-700",
      status === "matching"  && "bg-sky-50 text-sky-700",
    )}>
      {status}
    </span>
  );
}

function MatchStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
      status === "confirmed" && "bg-emerald-50 text-emerald-800",
      status === "canceled"  && "bg-red-50 text-red-700",
    )}>
      {status}
    </span>
  );
}

function TabButton({ active, icon: Icon, label, onClick }: {
  active: boolean;
  icon: typeof CalendarCheck;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-[8px] border px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-stone-200 bg-white/78 text-stone-600 hover:bg-white hover:text-neutral-950",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-28" />
      <Skeleton className="mt-6 h-10 w-48" />
      <div className="mt-6 grid gap-3">
        <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
      </div>
    </div>
  );
}
