"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarCheck, Check, CreditCard, Hash, MapPin, Navigation, UsersRound, X } from "lucide-react";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { PaymentModal } from "@/components/bookings/PaymentModal";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  cancelBooking,
  confirmBooking,
  verifyStripePayment,
  verifyMomoPayment,
  verifyVnpayPayment,
  verifyZalopayOrder,
} from "@/lib/api/bookings";
import { useRequireAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";
import { fieldDirectionsUrl } from "@/lib/utils/location";
import { useBooking } from "@/hooks/useBookings";
import type { Booking } from "@/lib/types";

export default function BookingDetailPage() {
  const params = useParams<{ bookingId: string }>();
  const { loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();
  const { booking, loading, error, refresh } = useBooking(params.bookingId);
  const searchParams = useSearchParams();
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Handle redirects back from payment providers
  useEffect(() => {
    const bookingId = params.bookingId;
    if (!bookingId) return;

    function clearParams() {
      window.history.replaceState({}, "", `/bookings/${bookingId}`);
    }

    // Stripe
    if (searchParams.get("stripe_success") === "1") {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) return;
      clearParams();
      verifyStripePayment(bookingId, sessionId)
        .then(() => { showToast("Payment confirmed via Stripe!"); refresh(); })
        .catch((e: unknown) => showToast(e instanceof Error ? e.message : "Stripe verification failed.", "error"));
      return;
    }

    // MoMo
    if (searchParams.get("momo_success") === "1") {
      clearParams();
      const momoParams = Object.fromEntries(searchParams.entries());
      verifyMomoPayment(bookingId, momoParams)
        .then(() => { showToast("Thanh toán MoMo thành công!"); refresh(); })
        .catch((e: unknown) => showToast(e instanceof Error ? e.message : "MoMo verification failed.", "error"));
      return;
    }

    // VNPay
    if (searchParams.get("vnpay_success") === "1") {
      clearParams();
      const vnpayParams = Object.fromEntries(searchParams.entries());
      verifyVnpayPayment(bookingId, vnpayParams)
        .then(() => { showToast("Thanh toán VNPay thành công!"); refresh(); })
        .catch((e: unknown) => showToast(e instanceof Error ? e.message : "VNPay verification failed.", "error"));
      return;
    }

    // ZaloPay — rely on IPN; just refresh and show pending if not yet marked
    if (searchParams.get("zalopay_success") === "1") {
      clearParams();
      verifyZalopayOrder(bookingId)
        .then((result) => {
          if ("pending" in result) {
            showToast(result.message, "error");
          } else {
            showToast("Thanh toán ZaloPay thành công!");
          }
          refresh();
        })
        .catch((e: unknown) => showToast(e instanceof Error ? e.message : "ZaloPay verification failed.", "error"));
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelCurrentBooking() {
    if (!booking) {
      return;
    }

    setActionLoading(true);
    try {
      await cancelBooking(booking.id);
      showToast("Booking canceled.");
      await refresh();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Unable to cancel booking.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmCurrentBooking() {
    if (!booking) {
      return;
    }

    setActionLoading(true);
    try {
      await confirmBooking(booking.id, booking.startTime, booking.endTime);
      showToast("Booking confirmed.");
      await refresh();
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Unable to confirm booking.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (authLoading || loading) {
    return <BookingDetailSkeleton />;
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorState message={error ?? "Booking not found."} onRetry={refresh} />
      </div>
    );
  }

  const canAct = booking.status === "pending" || booking.status === "confirmed";
  const directionsUrl = fieldDirectionsUrl(booking.field);

  function handlePaymentSuccess(updated: Booking) {
    showToast("Payment confirmed!");
    refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 hover:underline" href={ROUTES.bookings}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to bookings
      </Link>
      <section className="hairline-panel mt-4 flex flex-col gap-4 rounded-[8px] p-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-[0] text-neutral-950">
              {booking.field?.name ?? "Booking"}
            </h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-stone-600">
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            {formatDateRange(booking.startTime, booking.endTime)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.paymentStatus === "unpaid" && booking.status !== "canceled" ? (
            <Button onClick={() => setPaymentOpen(true)}>
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Pay Now
            </Button>
          ) : booking.paymentStatus === "paid" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              Paid
            </span>
          ) : null}
          {booking.status === "pending" ? (
            <Button variant="secondary" loading={actionLoading} onClick={confirmCurrentBooking}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Confirm
            </Button>
          ) : null}
          {canAct ? (
            <Button
              loading={actionLoading}
              variant="secondary"
              onClick={cancelCurrentBooking}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel
            </Button>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-neutral-950">Booking details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail icon={Hash} label="Booking ID" value={booking.id} />
              <Detail icon={UsersRound} label="Team size" value={String(booking.teamSize)} />
              <Detail
                icon={CalendarCheck}
                label="Total"
                value={formatCurrency(booking.totalPrice, booking.currency)}
              />
              <Detail
                icon={CreditCard}
                label="Payment"
                value={
                  booking.paymentStatus === "paid"
                    ? `Paid · ${booking.paymentMethod ?? ""}`
                    : booking.paymentStatus === "refunded"
                    ? "Refunded"
                    : "Unpaid"
                }
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-neutral-950">Timeline</h2>
            <div className="mt-5 space-y-4">
              {["Pending", "Confirmed", "Completed"].map((step, index) => (
                <div key={step} className="flex gap-3">
                  <span className="mt-1 h-3 w-3 rounded-full bg-neutral-950" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{step}</p>
                    <p className="text-xs text-stone-500">
                      {index === 0 ? "Created" : "Status checkpoint"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">Field</h2>
              <p className="mt-3 font-semibold text-neutral-950">
                {booking.field?.name ?? "Soccer field"}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-stone-500">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {booking.field?.address ?? booking.field?.complex?.name ?? "Address unavailable"}
              </p>
            </div>
            {directionsUrl ? (
              <a
                className={buttonClasses("primary", "md", "shrink-0")}
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Get directions
              </a>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <PaymentModal
        booking={booking}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] bg-stone-50 p-4 ring-1 ring-stone-200/70">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-sm text-neutral-950">{value}</p>
    </div>
  );
}

function BookingDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-6 h-64" />
      <Skeleton className="mt-6 h-40" />
    </div>
  );
}
