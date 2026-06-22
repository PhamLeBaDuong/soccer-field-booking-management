"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Copy,
  DoorOpen,
  Lock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/lib/auth/hooks";
import { useBookingsContext } from "@/lib/bookings/context";
import { joinLobby as apiJoinLobby } from "@/lib/api/lobbies";
import { useLobbies } from "@/hooks/useLobbies";
import { useJoinedLobbies } from "@/hooks/useJoinedLobbies";
import type { Booking, Field, Lobby, LobbyStatus } from "@/lib/types";
import { getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/context";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";

type BookingConfirmation = {
  fieldName: string;
  dateRange: string;
  teamSize: number;
  playerCount: number;
  pricePerHour: number;
  currency?: string;
};

export default function LobbiesPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();
  const { addBookings } = useBookingsContext();

  const { lobbies, setLobbies, loading: lobbiesLoading, error: lobbiesError, refresh: refreshLobbies } = useLobbies();
  const { joinedIds, markJoined } = useJoinedLobbies();

  const [filterStatus, setFilterStatus] = useState<LobbyStatus | "all">("all");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  // Real-time lobby updates via WebSocket
  useEffect(() => {
    const sock = getSocket();
    if (!sock) return;
    const onUpdate = (update: { id: string; joinedCount: number; status: string }) => {
      setLobbies((prev) =>
        prev.map((l) =>
          l.id === update.id
            ? { ...l, joinedCount: update.joinedCount, status: update.status as LobbyStatus }
            : l,
        ),
      );
    };
    sock.on("lobby:updated", onUpdate);
    return () => { sock.off("lobby:updated", onUpdate); };
  }, [setLobbies]);

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
      status:        "confirmed",
      totalPrice:    field.metadata.price * Math.max(0, hrs),
      currency:      field.metadata.currency ?? "VND",
      paymentStatus: "unpaid",
      field,
    };
  }

  async function handleJoin(lobby: Lobby) {
    if (joinedIds.includes(lobby.id)) {
      showToast("You have already joined this lobby.", "error"); return;
    }
    if (lobby.creatorId === user!.id) {
      showToast("You created this lobby — already counted in initial size.", "error"); return;
    }

    const prevCount = lobby.joinedCount;
    const newCount  = prevCount + 1;
    const hitCapacity = prevCount < lobby.teamSize && newCount >= lobby.teamSize;

    try {
      await apiJoinLobby(lobby.id);
      markJoined(lobby.id);
      await refreshLobbies();

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
          {t("lobby.openLobbies")}
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[0] sm:text-5xl">{t("lobby.title")}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/76">
          {t("lobby.subtitle")}
        </p>
      </section>

      <Modal
        open={!!confirmation}
        size="sm"
        title={t("lobby.bookingConfirmed")}
        onClose={() => setConfirmation(null)}
        footer={
          <Button className="w-full" onClick={() => setConfirmation(null)}>
            {t("common.close")}
          </Button>
        }
      >
        {confirmation && (
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-neutral-950">{confirmation.fieldName}</p>
              <p className="font-mono text-sm text-stone-600">{confirmation.dateRange}</p>
              <p className="text-xs text-stone-500">
                {confirmation.playerCount} {t("common.players")} · {formatCurrency(confirmation.pricePerHour, confirmation.currency)}/hr
              </p>
            </div>
          </div>
        )}
      </Modal>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-stone-500">
              {lobbiesLoading ? t("common.loading") : `${visibleLobbies.length} ${filterStatus === "all" ? t("common.all") : t(`lobby.${filterStatus}`)}`}
            </p>
            <h2 className="mt-0.5 text-2xl font-semibold text-neutral-950">{t("lobby.lobbies")}</h2>
          </div>
          <div className="flex gap-2">
            {(["all", "open", "full"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setFilterStatus(s)}
                className={cn(
                  "shrink-0 rounded-[8px] border px-3 py-1.5 text-xs font-semibold transition-colors",
                  filterStatus === s
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-stone-200 bg-white/78 text-stone-600 hover:bg-white",
                )}>
                {s === "all" ? t("common.all") : t(`lobby.${s}`)}
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
                title={t("lobby.noLobbies")}
                description={t("lobby.noLobbiesDesc")} />
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleLobbies.map((lobby, i) => (
              <motion.div
                key={lobby.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.2, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <LobbyCard
                  lobby={lobby}
                  hasJoined={joinedIds.includes(lobby.id)}
                  isOwner={!!user && (lobby.creatorId === user.id || lobby.creatorName === user.name)}
                  onJoin={handleJoin}
                  onCopy={copyText}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
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
                <motion.div
                  className={cn("h-full rounded-full", isFull ? "bg-emerald-500" : "bg-neutral-950")}
                  initial={false}
                  animate={{ width: `${filledPct}%` }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
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
      <div className="mt-6 flex flex-col gap-4">
        <Skeleton className="h-44" /><Skeleton className="h-44" />
      </div>
    </div>
  );
}
