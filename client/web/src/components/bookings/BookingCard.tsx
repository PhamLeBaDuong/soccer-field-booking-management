"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarCheck, MapPin, Search, UsersRound, X } from "lucide-react";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Booking } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const statusBorder: Record<Booking["status"], string> = {
  confirmed: "border-l-[3px] border-l-emerald-400",
  pending:   "border-l-[3px] border-l-amber-400",
  canceled:  "border-l-[3px] border-l-red-400",
  matching:  "border-l-[3px] border-l-sky-400",
};

export function BookingCard({
  booking,
  onCancel,
  onFindMatch,
}: {
  booking: Booking;
  onCancel?: (bookingId: string) => Promise<void>;
  onFindMatch?: () => void;
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  async function handleCancel() {
    if (!onCancel) return;
    setLoading(true);
    try {
      await onCancel(booking.id);
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "rounded-[8px] border border-stone-200/75 bg-white transition-all duration-200",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_14px_44px_rgba(12,12,12,0.06)]",
          "hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_20px_56px_rgba(12,12,12,0.10)]",
          "overflow-hidden",
          statusBorder[booking.status],
        )}
      >
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold tracking-[-0.01em] text-neutral-950">
                {booking.field?.name ?? "Soccer field"}
              </h2>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {booking.field?.complex?.name ?? booking.field?.address ?? "Field booking"}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 font-mono text-sm text-neutral-700">
              <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />
              {formatDateRange(booking.startTime, booking.endTime)}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500">
              <UsersRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t("bookings.teamSize")}: {booking.teamSize}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="font-mono text-xl font-semibold tracking-[-0.02em] text-neutral-950">
              {formatCurrency(booking.totalPrice, booking.currency)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                className={buttonClasses("secondary", "sm")}
                href={`/bookings/${booking.id}`}
              >
                {t("bookings.viewDetails")}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              {booking.needMatching ? (
                <Button variant="secondary" size="sm" onClick={onFindMatch}>
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  Find Match
                </Button>
              ) : null}
              {canCancel ? (
                <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("common.cancel")}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={confirming}
        size="sm"
        title={t("bookings.confirmCancel")}
        onClose={() => setConfirming(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {t("common.no")}
            </Button>
            <Button variant="danger" loading={loading} onClick={handleCancel}>
              {t("common.yes")}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-stone-600">
          {t("bookings.cancelWarning")}
        </p>
      </Modal>
    </>
  );
}
