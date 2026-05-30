"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DoorOpen,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Users,
  UsersRound,
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
import { createLobby as apiCreateLobby, joinLobby as apiJoinLobby } from "@/lib/api/lobbies";
import { useLobbies } from "@/hooks/useLobbies";
import { useJoinedLobbies } from "@/hooks/useJoinedLobbies";
import { useFields } from "@/hooks/useFields";
import type { Booking, Field, Lobby, LobbyStatus, MatchRequestVisibility } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import {
  combineDateAndTime,
  formatCurrency,
  formatDateRange,
  todayInputValue,
} from "@/lib/utils/format";

type LobbyForm = {
  fieldId: string;
  date: string;
  start: string;
  end: string;
  initialSize: string;
  visibility: MatchRequestVisibility;
};

type BookingConfirmation = {
  fieldName: string;
  dateRange: string;
  teamSize: number;
  playerCount: number;
  pricePerHour: number;
  currency?: string;
};

const BASE_FORM: Omit<LobbyForm, "fieldId"> = {
  date:        todayInputValue(),
  start:       "18:00",
  end:         "20:00",
  initialSize: "1",
  visibility:  "public",
};

function sideSize(field: Field): number {
  const n = Number.parseInt(field.type, 10);
  return Number.isNaN(n) ? 5 : n;
}

function teamSize(field: Field): number {
  return sideSize(field) * 2;
}

export default function LobbiesPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();
  const { addBookings } = useBookingsContext();

  const { fields, loading: fieldsLoading } = useFields();
  const { lobbies, loading: lobbiesLoading, error: lobbiesError, refresh: refreshLobbies } = useLobbies();
  const { joinedIds, markJoined } = useJoinedLobbies();

  const [form, setForm] = useState<LobbyForm>({ fieldId: "", ...BASE_FORM });
  const [filterStatus, setFilterStatus] = useState<LobbyStatus | "all">("all");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  // Set default field once fields load
  useEffect(() => {
    if (fields.length > 0 && !form.fieldId) {
      setForm((p) => ({ ...p, fieldId: fields[0].id }));
    }
  }, [fields]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleLobbies = lobbies.filter(
    (l) => filterStatus === "all" || l.status === filterStatus,
  );

  if (authLoading || !user) return <LobbiesSkeleton />;

  function buildBooking(lobby: Lobby, field: Field): Booking {
    const hrs = (new Date(lobby.endTime).getTime() - new Date(lobby.startTime).getTime()) / 3_600_000;
    return {
      id:         `booking-lobby-${lobby.id}-${Date.now()}`,
      userId:     user!.id,
      fieldId:    field.id,
      startTime:  lobby.startTime,
      endTime:    lobby.endTime,
      needMatching: false,
      teamSize:   lobby.teamSize,
      status:     "confirmed",
      totalPrice: field.metadata.price * Math.max(0, hrs),
      currency:   field.metadata.currency ?? "VND",
      field,
    };
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const field = fields.find((f) => f.id === form.fieldId);
    if (!field) { showToast("Choose a field.", "error"); return; }

    const ts = teamSize(field);
    const initialSize = Number(form.initialSize);
    if (initialSize < 1 || initialSize > ts) {
      showToast(`Initial players must be 1–${ts}.`, "error"); return;
    }

    try {
      const result = await apiCreateLobby({
        fieldId:     field.id,
        startTime:   combineDateAndTime(form.date, form.start),
        endTime:     combineDateAndTime(form.date, form.end),
        teamSize:    ts,
        initialSize,
        visibility:  form.visibility,
      });

      await refreshLobbies();

      if (result.lobby.status === "full") {
        addBookings([buildBooking(result.lobby, field)]);
        setConfirmation({
          fieldName:    field.name,
          dateRange:    formatDateRange(result.lobby.startTime, result.lobby.endTime),
          teamSize:     ts,
          playerCount:  initialSize,
          pricePerHour: field.metadata.price,
          currency:     field.metadata.currency,
        });
        showToast("Lobby full — booking confirmed!");
      } else {
        showToast("Lobby created.");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create lobby.", "error");
    }
  }

  async function handleJoin(lobby: Lobby) {
    if (joinedIds.includes(lobby.id)) {
      showToast("You have already joined this lobby.", "error"); return;
    }
    if (lobby.creatorId === user.id) {
      showToast("You created this lobby — already counted in initial size.", "error"); return;
    }

    const prevCount = lobby.joinedCount;
    const newCount  = prevCount + 1;
    const hitCapacity = prevCount < lobby.teamSize && newCount >= lobby.teamSize;

    try {
      await apiJoinLobby(lobby.id);
      markJoined(lobby.id);
      await refreshLobbies(); // pulls server-accurate count

      if (lobby.field) addBookings([buildBooking({ ...lobby, joinedCount: newCount }, lobby.field)]);

      if (hitCapacity) {
        setConfirmation({
          fieldName:    lobby.field?.name ?? "Field",
          dateRange:    formatDateRange(lobby.startTime, lobby.endTime),
          teamSize:     lobby.teamSize,
          playerCount:  newCount,
          pricePerHour: lobby.field?.metadata.price ?? 0,
          currency:     lobby.field?.metadata.currency,
        });
        showToast("Lobby full — booking confirmed!");
      } else if (lobby.status === "full") {
        showToast("Added to confirmed booking.");
      } else {
        showToast("Joined lobby.");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to join lobby.", "error");
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => showToast("Copied."));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="pitch-hero-bg rounded-[8px] p-6 text-white shadow-[0_30px_90px_rgba(23,23,23,0.18)] sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86 ring-1 ring-white/18 backdrop-blur">
          <DoorOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Open lobbies
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[0] sm:text-5xl">Lobby list</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/76">
          Join an open lobby or create your own. Booking is confirmed the moment a lobby reaches capacity.
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
                <p className="text-sm font-bold text-emerald-900">Booking confirmed!</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-800">{confirmation.fieldName}</p>
                <p className="mt-0.5 font-mono text-sm text-emerald-700">{confirmation.dateRange}</p>
                <p className="mt-1 text-xs text-emerald-700">
                  {confirmation.playerCount} players · {formatCurrency(confirmation.pricePerHour, confirmation.currency)}/hr
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
        {/* Create form */}
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase text-stone-500">New lobby</p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-950">Create a lobby</h2>

            <form className="mt-5 grid gap-3" onSubmit={handleCreate}>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-neutral-900">Field</span>
                <select
                  className="select-control"
                  value={form.fieldId}
                  disabled={fieldsLoading}
                  onChange={(e) => setForm((p) => ({ ...p, fieldId: e.target.value }))}
                >
                  {fieldsLoading && <option>Loading fields…</option>}
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — target {teamSize(f)} players
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Initial players"
                  type="number"
                  min={1}
                  leadingIcon={<UsersRound className="h-4 w-4" aria-hidden="true" />}
                  value={form.initialSize}
                  onChange={(e) => setForm((p) => ({ ...p, initialSize: e.target.value }))}
                />
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-900">Visibility</span>
                  <select className="select-control" value={form.visibility}
                    onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value as MatchRequestVisibility }))}>
                    <option value="public">Public</option>
                    <option value="private">Private (code)</option>
                  </select>
                </label>
              </div>

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

              <Button className="w-full" type="submit" disabled={fieldsLoading}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create lobby
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lobby list */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">
                {lobbiesLoading ? "Loading…" : `${visibleLobbies.length} ${filterStatus === "all" ? "total" : filterStatus}`}
              </p>
              <h2 className="mt-0.5 text-2xl font-semibold text-neutral-950">Lobbies</h2>
            </div>
            <div className="flex gap-2">
              {(["all", "open", "full"] as const).map((s) => (
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

          {lobbiesError && <ErrorState message={lobbiesError} onRetry={refreshLobbies} />}

          {lobbiesLoading ? (
            <>
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </>
          ) : visibleLobbies.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState icon={<DoorOpen className="h-5 w-5" />}
                  title="No lobbies yet"
                  description="Create the first lobby using the form." />
              </CardContent>
            </Card>
          ) : (
            visibleLobbies.map((lobby) => (
              <LobbyCard
                key={lobby.id}
                lobby={lobby}
                hasJoined={joinedIds.includes(lobby.id)}
                isOwner={!!user && (lobby.creatorId === user.id || lobby.creatorName === user.name)}
                onJoin={handleJoin}
                onCopy={copyText}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Lobby Card ───────────────────────────────────────────────────────────────

function LobbyCard({
  lobby, hasJoined, isOwner, onJoin, onCopy,
}: {
  lobby: Lobby;
  hasJoined: boolean;
  isOwner: boolean;
  onJoin: (l: Lobby) => void;
  onCopy: (text: string) => void;
}) {
  const filledPct = Math.min(100, (lobby.joinedCount / lobby.teamSize) * 100);
  const isFull    = lobby.status === "full";
  const remaining = Math.max(0, lobby.teamSize - lobby.joinedCount);

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-950">{lobby.field?.name ?? "Lobby"}</h3>
              <StatusPill status={lobby.status} />
              {lobby.visibility === "private" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
                  <Lock className="h-3 w-3" aria-hidden="true" />Private
                </span>
              )}
              {isFull && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />Booking active
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm text-stone-500">
              Host: {lobby.creatorName} · Initial {lobby.initialSize} · {lobby.teamSize / 2}v{lobby.teamSize / 2}
            </p>
            <p className="mt-1 font-mono text-sm text-neutral-700">
              {formatDateRange(lobby.startTime, lobby.endTime)}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-[6px] bg-stone-50 px-2 py-1 font-mono text-xs text-stone-500 ring-1 ring-stone-200">
                ID: {lobby.id}
              </span>
              <button type="button" onClick={() => onCopy(lobby.id)} className="text-stone-400 hover:text-neutral-950">
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {lobby.visibility === "private" && lobby.code && (
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-[6px] bg-amber-50 px-2 py-1 font-mono text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  Code: {lobby.code}
                </span>
                <button type="button" onClick={() => onCopy(lobby.code!)} className="text-stone-400 hover:text-neutral-950">
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="mt-4">
              <div className="flex justify-between text-xs font-semibold text-stone-500">
                <span>{lobby.joinedCount}/{lobby.teamSize} players</span>
                <span className={isFull ? "text-emerald-600" : ""}>
                  {isFull ? "Full — booking confirmed" : `${remaining} slots left`}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                <div className={cn("h-full rounded-full transition-all", isFull ? "bg-emerald-500" : "bg-neutral-950")}
                  style={{ width: `${filledPct}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center gap-2 md:flex-col md:items-end">
            <div className="text-left md:text-right">
              <p className="font-mono text-lg font-semibold text-neutral-950">
                {formatCurrency(lobby.field?.metadata.price ?? 0, lobby.field?.metadata.currency)}
              </p>
              <p className="text-xs text-stone-500">per hour</p>
            </div>
            <Button
              disabled={hasJoined || isOwner}
              onClick={() => onJoin(lobby)}
              variant={hasJoined ? "secondary" : "primary"}
              title={hasJoined ? "Already joined" : isOwner ? "You created this lobby" : undefined}
            >
              {hasJoined
                ? <><Check className="h-4 w-4" aria-hidden="true" />Joined</>
                : isFull
                  ? <><Users className="h-4 w-4" aria-hidden="true" />Join anyway</>
                  : <><Users className="h-4 w-4" aria-hidden="true" />Join</>}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: LobbyStatus }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-1 text-xs font-semibold capitalize",
      status === "open"     && "bg-emerald-50 text-emerald-800",
      status === "full"     && "bg-sky-50 text-sky-800",
      status === "canceled" && "bg-red-50 text-red-700",
    )}>
      {status}
    </span>
  );
}

function LobbiesSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-48" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-96" /><Skeleton className="h-96" />
      </div>
    </div>
  );
}
