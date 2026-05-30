"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Send,
  ShieldCheck,
  Swords,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/lib/auth/hooks";
import { useBookingsContext } from "@/lib/bookings/context";
import { acceptMatchPost, listMatchPosts } from "@/lib/api/matchPosts";
import { createMatchPost } from "@/lib/api/teams";
import { useMatchPosts } from "@/hooks/useMatchPosts";
import { useTeams } from "@/hooks/useTeams";
import { useFields } from "@/hooks/useFields";
import type { Booking, Field, MatchRequest, MatchRequestStatus, MatchRequestVisibility, Team } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { combineDateAndTime, formatCurrency, formatDateRange, todayInputValue } from "@/lib/utils/format";

type PostForm = {
  teamId: string;
  fieldId: string;
  date: string;
  start: string;
  end: string;
  visibility: MatchRequestVisibility;
  note: string;
};

type BookingConfirmation = {
  postingTeam: string;
  acceptingTeam: string;
  fieldName: string;
  dateRange: string;
  teamSize: number;
  priceEstimate: number;
  currency?: string;
};

const BASE_FORM: Omit<PostForm, "teamId" | "fieldId"> = {
  date:       todayInputValue(),
  start:      "18:00",
  end:        "20:00",
  visibility: "public",
  note:       "",
};

export default function MatchingPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();
  const { addBookings } = useBookingsContext();

  const { fields, loading: fieldsLoading } = useFields();
  const { teams, loading: teamsLoading, refresh: refreshTeams } = useTeams();
  const { posts, loading: postsLoading, error: postsError, refresh: refreshPosts } = useMatchPosts();

  const [form, setForm] = useState<PostForm>({ teamId: "", fieldId: "", ...BASE_FORM });
  const [activeTeamId, setActiveTeamId] = useState("");
  const [filterStatus, setFilterStatus] = useState<MatchRequestStatus | "all">("all");
  const [acceptedIds, setAcceptedIds] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  // Default to first loaded team + field
  useEffect(() => {
    if (teams.length > 0 && !form.teamId) {
      setForm((p) => ({ ...p, teamId: teams[0].id }));
      setActiveTeamId(teams[0].id);
    }
  }, [teams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fields.length > 0 && !form.fieldId) {
      setForm((p) => ({ ...p, fieldId: fields[0].id }));
    }
  }, [fields]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? teams[0];
  const visiblePosts = posts.filter((p) => filterStatus === "all" || p.status === filterStatus);

  if (authLoading || !user) return <MatchingSkeleton />;

  async function handlePost(event: React.FormEvent) {
    event.preventDefault();
    const team  = teams.find((t) => t.id === form.teamId);
    const field = fields.find((f) => f.id === form.fieldId);
    if (!team)  { showToast("Select a team.", "error");  return; }
    if (!field) { showToast("Select a field.", "error"); return; }

    try {
      await createMatchPost({
        teamId:             team.id,
        fieldId:            field.id,
        preferredStartTime: combineDateAndTime(form.date, form.start),
        preferredEndTime:   combineDateAndTime(form.date, form.end),
        visibility:         form.visibility,
        note:               form.note || undefined,
      });
      await refreshPosts();
      showToast("Match request posted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to post request.", "error");
    }
  }

  async function handleAccept(post: MatchRequest) {
    if (!activeTeam) { showToast("Select a team first.", "error"); return; }
    if (activeTeam.id === post.teamId) { showToast("Cannot accept your own request.", "error"); return; }
    if (activeTeam.size !== post.teamSize) {
      showToast(`Need a ${post.teamSize}v${post.teamSize} team to accept this.`, "error"); return;
    }
    if (acceptedIds.includes(post.id)) { showToast("Already accepted.", "error"); return; }

    try {
      await acceptMatchPost(post.id, { acceptingTeamId: activeTeam.id });
      setAcceptedIds((prev) => [...prev, post.id]);
      await refreshPosts();

      // Optimistic booking in context for instant Bookings tab feedback
      const field = post.field;
      if (field && user) {
        const hrs = (new Date(post.preferredEndTime).getTime() - new Date(post.preferredStartTime).getTime()) / 3_600_000;
        const booking: Booking = {
          id:           `booking-match-${post.id}-${Date.now()}`,
          userId:       user.id,
          fieldId:      field.id,
          startTime:    post.preferredStartTime,
          endTime:      post.preferredEndTime,
          needMatching: false,
          teamSize:     post.teamSize,
          status:       "confirmed",
          totalPrice:   field.metadata.price * Math.max(0, hrs),
          currency:     field.metadata.currency ?? "VND",
          field,
        };
        addBookings([booking]);
      }

      setConfirmation({
        postingTeam:  post.teamName,
        acceptingTeam: activeTeam.name,
        fieldName:    post.field?.name ?? "Field",
        dateRange:    formatDateRange(post.preferredStartTime, post.preferredEndTime),
        teamSize:     post.teamSize,
        priceEstimate: (post.field?.metadata.price ?? 0) * 2,
        currency:     post.field?.metadata.currency,
      });

      showToast(`Match confirmed — ${activeTeam.name} vs ${post.teamName}!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to accept.", "error");
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => showToast("Copied."));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="pitch-hero-bg rounded-[8px] p-6 text-white shadow-[0_30px_90px_rgba(23,23,23,0.18)] sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86 ring-1 ring-white/18 backdrop-blur">
          <Swords className="h-3.5 w-3.5" aria-hidden="true" />
          Matchmaking
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[0] sm:text-5xl">Match requests</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/76">
          Post a challenge or accept an open request. Booking is confirmed the moment a match is made.
        </p>
      </section>

      {confirmation && (
        <div className="mt-5 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-emerald-900">Match booking confirmed!</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-800">
                  {confirmation.postingTeam} vs {confirmation.acceptingTeam}
                </p>
                <p className="mt-0.5 text-sm text-emerald-700">{confirmation.fieldName}</p>
                <p className="mt-0.5 font-mono text-sm text-emerald-700">{confirmation.dateRange}</p>
                <p className="mt-1 text-xs text-emerald-700">
                  {confirmation.teamSize}v{confirmation.teamSize} · Est. {formatCurrency(confirmation.priceEstimate, confirmation.currency)}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setConfirmation(null)} className="shrink-0 p-1 text-emerald-600 hover:bg-emerald-100 rounded-[6px]">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* Post form */}
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase text-stone-500">Post request</p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-950">New match request</h2>

            {/* Active team selector */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-stone-500">Playing as</p>
              {teamsLoading ? (
                <Skeleton className="h-9" />
              ) : teams.length === 0 ? (
                <p className="rounded-[8px] bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
                  No teams yet — create one on the <a href="/teams" className="underline font-semibold">Teams</a> page first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {teams.map((team) => (
                    <button key={team.id} type="button"
                      onClick={() => { setActiveTeamId(team.id); setForm((p) => ({ ...p, teamId: team.id })); }}
                      className={cn(
                        "rounded-[8px] border px-3 py-1.5 text-xs font-semibold transition-colors",
                        activeTeamId === team.id
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-stone-200 bg-white/80 text-stone-600 hover:bg-stone-50",
                      )}>
                      {team.name} · {team.size}v{team.size}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form className="mt-4 grid gap-3" onSubmit={handlePost}>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-neutral-900">Field</span>
                <select className="select-control" value={form.fieldId} disabled={fieldsLoading}
                  onChange={(e) => setForm((p) => ({ ...p, fieldId: e.target.value }))}>
                  {fieldsLoading && <option>Loading…</option>}
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </label>

              <Input label="Date" type="date"
                leadingIcon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Start" type="time"
                  leadingIcon={<Clock className="h-4 w-4" aria-hidden="true" />}
                  value={form.start} onChange={(e) => setForm((p) => ({ ...p, start: e.target.value }))} />
                <Input label="End" type="time"
                  leadingIcon={<Clock className="h-4 w-4" aria-hidden="true" />}
                  value={form.end} onChange={(e) => setForm((p) => ({ ...p, end: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-900">Visibility</span>
                  <select className="select-control" value={form.visibility}
                    onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value as MatchRequestVisibility }))}>
                    <option value="public">Public</option>
                    <option value="private">Private (code)</option>
                  </select>
                </label>
                <Input label="Note (optional)" placeholder="Friendly pace…"
                  value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
              </div>

              <Button className="w-full" type="submit" disabled={teams.length === 0 || fieldsLoading}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Post request
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Match list */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">
                {postsLoading ? "Loading…" : `${visiblePosts.length} ${filterStatus === "all" ? "total" : filterStatus}`}
              </p>
              <h2 className="mt-0.5 text-2xl font-semibold text-neutral-950">Match list</h2>
            </div>
            <div className="flex gap-2">
              {(["all", "open", "matched"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setFilterStatus(s)}
                  className={cn(
                    "shrink-0 rounded-[8px] border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                    filterStatus === s
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-stone-200 bg-white/78 text-stone-600 hover:bg-white",
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {postsError && <ErrorState message={postsError} onRetry={refreshPosts} />}

          {postsLoading ? (
            <><Skeleton className="h-44" /><Skeleton className="h-44" /></>
          ) : visiblePosts.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState icon={<Swords className="h-5 w-5" />}
                  title="No match requests"
                  description="Post a request above to find an opponent." />
              </CardContent>
            </Card>
          ) : (
            visiblePosts.map((post) => (
              <MatchPostCard
                key={post.id}
                post={post}
                activeTeam={activeTeam}
                isOwner={post.teamId === activeTeamId}
                hasAccepted={acceptedIds.includes(post.id)}
                onAccept={handleAccept}
                onCopy={copyText}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Match Post Card ──────────────────────────────────────────────────────────

function MatchPostCard({
  post, activeTeam, isOwner, hasAccepted, onAccept, onCopy,
}: {
  post: MatchRequest;
  activeTeam?: Team;
  isOwner: boolean;
  hasAccepted: boolean;
  onAccept: (p: MatchRequest) => void;
  onCopy: (text: string) => void;
}) {
  const canAccept =
    !hasAccepted &&
    post.status === "open" &&
    !isOwner &&
    !!activeTeam &&
    activeTeam.size === post.teamSize;

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-950">{post.teamName}</h3>
              <StatusPill status={post.status} />
              {post.visibility === "private" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
                  <Lock className="h-3 w-3" aria-hidden="true" />Private
                </span>
              )}
              {hasAccepted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />Booking confirmed
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm text-stone-500">
              {post.field?.name ?? "Field"} · {post.teamSize}v{post.teamSize}
            </p>
            <p className="mt-1 font-mono text-sm text-neutral-700">
              {formatDateRange(post.preferredStartTime, post.preferredEndTime)}
            </p>
            {post.note && <p className="mt-1.5 text-sm text-stone-500">{post.note}</p>}

            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-[6px] bg-stone-50 px-2 py-1 font-mono text-xs text-stone-500 ring-1 ring-stone-200">
                ID: {post.id}
              </span>
              <button type="button" onClick={() => onCopy(post.id)} className="text-stone-400 hover:text-neutral-950">
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {post.visibility === "private" && post.code && (
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-[6px] bg-amber-50 px-2 py-1 font-mono text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  Code: {post.code}
                </span>
                <button type="button" onClick={() => onCopy(post.code!)} className="text-stone-400 hover:text-neutral-950">
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-row items-center gap-2 md:flex-col md:items-end">
            <div className="text-left md:text-right">
              <p className="font-mono text-lg font-semibold text-neutral-950">
                {formatCurrency((post.field?.metadata.price ?? 0) * 2, post.field?.metadata.currency)}
              </p>
              <p className="text-xs text-stone-500">estimated slot</p>
            </div>
            <Button
              disabled={!canAccept}
              onClick={() => onAccept(post)}
              variant={canAccept ? "primary" : "secondary"}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {hasAccepted ? "Accepted" : post.status === "matched" ? "Matched" : "Accept"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: MatchRequestStatus }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-1 text-xs font-semibold capitalize",
      status === "open"     && "bg-emerald-50 text-emerald-800",
      status === "matched"  && "bg-sky-50 text-sky-800",
      status === "canceled" && "bg-red-50 text-red-700",
    )}>
      {status}
    </span>
  );
}

function MatchingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-48" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-96" /><Skeleton className="h-96" />
      </div>
    </div>
  );
}
