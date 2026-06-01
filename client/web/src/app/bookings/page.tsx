"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  ListFilter,
  Search,
  UsersRound,
  XCircle,
} from "lucide-react";
import { BookingCard } from "@/components/bookings/BookingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/lib/auth/hooks";
import { useI18n } from "@/lib/i18n/context";
import { ROUTES } from "@/lib/constants";
import type { Booking, BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useBookings } from "@/hooks/useBookings";

type BookingTab = "all" | "upcoming" | BookingStatus;

const tabs: { tkey: string; value: BookingTab }[] = [
  { tkey: "common.all",       value: "all" },
  { tkey: "status.upcoming",  value: "upcoming" },
  { tkey: "status.pending",   value: "pending" },
  { tkey: "status.confirmed", value: "confirmed" },
  { tkey: "status.canceled",  value: "canceled" },
];

const tabIcons = {
  all:       ListFilter,
  upcoming:  Clock3,
  pending:   Search,
  confirmed: CheckCircle2,
  canceled:  XCircle,
  matching:  UsersRound,
} as const;

export default function BookingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useI18n();
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
      {/* Page header */}
      <section className="reveal-up">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-stone-400">
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t("bookings.schedule")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
          {t("bookings.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          {t("bookings.subtitle")}
        </p>
      </section>

      {/* Tab bar */}
      <div className="mt-6 flex gap-1.5 overflow-x-auto rounded-[10px] border border-stone-200/80 bg-stone-50 p-1.5">
        {tabs.map((item) => (
          <TabButton
            key={item.value}
            active={tab === item.value}
            icon={tabIcons[item.value]}
            label={t(item.tkey)}
            onClick={() => setTab(item.value)}
          />
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {error ? <ErrorState message={error} onRetry={refresh} /> : null}
        {loading ? (
          <div className="grid gap-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : filtered.length ? (
          <div className="grid gap-3">
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
            icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
            title={t("bookings.empty")}
            description={t("bookings.emptyDesc")}
            action={{
              label: t("bookings.bookField"),
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
        "flex shrink-0 items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-sm font-semibold transition-all duration-150",
        active
          ? "bg-white text-neutral-950 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
          : "text-stone-500 hover:bg-white/60 hover:text-neutral-800",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

function filterBookings(bookings: Booking[], tab: BookingTab): Booking[] {
  if (tab === "all") return bookings;

  if (tab === "upcoming") {
    return bookings.filter(
      (b) => new Date(b.startTime).getTime() >= Date.now() && b.status !== "canceled",
    );
  }

  return bookings.filter((b) => b.status === tab);
}

function BookingsSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-2 h-9 w-52" />
      <Skeleton className="mt-6 h-12 rounded-[10px]" />
      <div className="mt-6 grid gap-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
