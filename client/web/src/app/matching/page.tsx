"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Search, UsersRound } from "lucide-react";
import { MatchCard } from "@/components/matching/MatchCard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  createBooking,
  joinMatch,
  searchMatchingBookings,
} from "@/lib/api/bookings";
import { useRequireAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";
import type { Booking } from "@/lib/types";
import {
  combineDateAndTime,
  durationHours,
  todayInputValue,
} from "@/lib/utils/format";

export default function MatchingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();
  const [teamSize, setTeamSize] = useState("5");
  const [date, setDate] = useState(todayInputValue());
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("20:00");
  const [matches, setMatches] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState("");

  async function search(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      setMatches(
        await searchMatchingBookings({
          teamSize: Number(teamSize),
          startTime: combineDateAndTime(date, start),
          endTime: combineDateAndTime(date, end),
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to search matches.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(match: Booking) {
    if (!user) {
      router.push(ROUTES.login);
      return;
    }

    setJoiningId(match.id);
    try {
      const hours = durationHours(match.startTime, match.endTime) || 1;
      const fieldPrice =
        match.field?.metadata.price ?? Math.max(1, match.totalPrice / hours);
      const userBooking = await createBooking({
        userId: user.id,
        fieldId: match.fieldId,
        startTime: match.startTime,
        endTime: match.endTime,
        needMatching: true,
        teamSize: match.teamSize,
        fieldPrice,
        currency: match.currency,
      });
      await joinMatch(
        match.id,
        userBooking.id,
        match.startTime,
        match.endTime,
        match.fieldId,
      );
      showToast("Match joined.");
      router.push(ROUTES.bookings);
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Unable to join match.",
        "error",
      );
    } finally {
      setJoiningId("");
    }
  }

  if (authLoading || !user) {
    return <MatchingSkeleton />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="pitch-hero-bg rounded-[8px] p-6 text-white shadow-[0_30px_90px_rgba(23,23,23,0.18)] sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86 ring-1 ring-white/18 backdrop-blur">
          <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
          Matching
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[0] sm:text-5xl">
          Find your next opponent
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-white/76">
          Search open games by team size and time.
        </p>
      </section>

      <Card className="mt-6">
        <CardContent>
          <form className="grid gap-4 md:grid-cols-5" onSubmit={search}>
            <Input
              label="Team size"
              type="number"
              min={2}
              leadingIcon={<UsersRound className="h-4 w-4" aria-hidden="true" />}
              value={teamSize}
              onChange={(event) => setTeamSize(event.target.value)}
            />
            <Input
              label="Date"
              type="date"
              leadingIcon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <Input
              label="Start"
              type="time"
              leadingIcon={<Clock className="h-4 w-4" aria-hidden="true" />}
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
            <Input
              label="End"
              type="time"
              leadingIcon={<Clock className="h-4 w-4" aria-hidden="true" />}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
            <div className="flex items-end">
              <Button className="w-full" loading={loading} type="submit">
                <Search className="h-4 w-4" aria-hidden="true" />
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6">
        {error ? <ErrorState message={error} onRetry={() => search()} /> : null}
        {loading ? (
          <div className="grid gap-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        ) : matches.length ? (
          <div className="grid gap-4">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                booking={match}
                loading={joiningId === match.id}
                onJoin={handleJoin}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<span className="text-lg">2</span>}
            title="No matches loaded"
            description="Search by team size and time to find shared games."
            action={{ label: "Search Matches", onClick: () => search() }}
          />
        )}
      </div>
    </div>
  );
}

function MatchingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-6 h-32" />
      <Skeleton className="mt-6 h-36" />
    </div>
  );
}
