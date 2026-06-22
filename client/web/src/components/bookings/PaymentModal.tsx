"use client";

import { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { BadgeCheck, Banknote, Building2, Clock, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  getPaymentOptions,
  payBooking,
  createStripeCheckout,
  createPaypalOrder,
  capturePaypalPayment,
  createMomoPayment,
  createVnpayPayment,
  createZalopayOrder,
} from "@/lib/api/bookings";
import type { Booking, PaymentMethod, PaymentOption } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash:          <Banknote className="h-5 w-5" aria-hidden="true" />,
  bank_transfer: <Building2 className="h-5 w-5" aria-hidden="true" />,
  stripe:        <CreditCard className="h-5 w-5" aria-hidden="true" />,
  paypal:        <span className="text-sm font-extrabold text-[#003087]">Pay<span className="text-[#009cde]">Pal</span></span>,
  momo:          <span className="text-base font-bold text-[#ae2070]">M</span>,
  vnpay:         <span className="text-base font-bold text-[#005bab]">V</span>,
  zalopay:       <span className="text-base font-bold text-[#0068ff]">Z</span>,
};

const BANK_DETAILS = {
  bank:          "Vietcombank",
  accountNumber: "1234 5678 9012",
  accountName:   "PITCHBOOK VIETNAM",
};

export function PaymentModal({
  booking,
  open,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  open: boolean;
  onClose: () => void;
  onSuccess: (updated: Booking) => void;
}) {
  const [options,  setOptions]  = useState<PaymentOption[]>([]);
  const [selected, setSelected] = useState<PaymentMethod>("cash");
  const [loading,  setLoading]  = useState(false);
  const [paid,     setPaid]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPaid(false);
    setError(null);
    setSelected("cash");
    getPaymentOptions(booking.id).then(setOptions).catch(() => setOptions([]));
  }, [open, booking.id]);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      // Redirect-based providers — go to their hosted page
      if (selected === "stripe") {
        const { url } = await createStripeCheckout(booking.id);
        window.location.href = url;
        return;
      }
      if (selected === "momo") {
        const { payUrl } = await createMomoPayment(booking.id);
        window.location.href = payUrl;
        return;
      }
      if (selected === "vnpay") {
        const { payUrl } = await createVnpayPayment(booking.id);
        window.location.href = payUrl;
        return;
      }
      if (selected === "zalopay") {
        const { payUrl } = await createZalopayOrder(booking.id);
        window.location.href = payUrl;
        return;
      }

      // Immediate providers (cash, bank_transfer)
      const result = await payBooking(booking.id, selected);
      if ("message" in result && !("id" in result)) {
        setError((result as { message: string }).message);
        return;
      }
      setPaid(true);
      onSuccess(result as Booking);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handlePaypalSuccess(updated: Booking) {
    setPaid(true);
    onSuccess(updated);
  }

  const selectedOption = options.find((o) => o.id === selected);
  const isPayPal   = selected === "paypal";
  const isStripe   = selected === "stripe";
  const isRedirect = ["stripe", "momo", "vnpay", "zalopay"].includes(selected);

  const REDIRECT_NOTES: Partial<Record<PaymentMethod, string>> = {
    stripe:  "You will be redirected to Stripe's secure checkout to pay by credit or debit card.",
    momo:    "Bạn sẽ được chuyển đến ứng dụng MoMo để hoàn tất thanh toán.",
    vnpay:   "Bạn sẽ được chuyển đến cổng thanh toán VNPay để hoàn tất thanh toán.",
    zalopay: "Bạn sẽ được chuyển đến ZaloPay để hoàn tất thanh toán.",
  };

  return (
    <Modal
      open={open}
      title="Thanh toán / Payment"
      size="md"
      onClose={onClose}
      footer={
        paid ? (
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : isPayPal ? (
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-lg font-semibold text-neutral-950">
              {formatCurrency(booking.totalPrice, booking.currency)}
            </p>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-lg font-semibold text-neutral-950">
              {formatCurrency(booking.totalPrice, booking.currency)}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button
                loading={loading}
                disabled={!selectedOption?.available}
                onClick={handleConfirm}
              >
                {isRedirect ? (
                  <>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Continue to {selectedOption?.label.split(" ")[0]}
                  </>
                ) : (
                  "Confirm Payment"
                )}
              </Button>
            </div>
          </div>
        )
      }
    >
      {paid ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <BadgeCheck className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="text-lg font-semibold text-neutral-950">Payment confirmed!</p>
          <p className="text-sm text-stone-500">
            Your booking has been marked as paid via{" "}
            {options.find((o) => o.id === selected)?.label ?? selected}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Select a payment method for <strong>{booking.field?.name ?? "this booking"}</strong>.
          </p>

          {/* Method list */}
          <div className="space-y-2">
            {options.map((opt) => (
              <label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[8px] border p-3.5 transition-colors",
                  !opt.available && "cursor-not-allowed opacity-60",
                  selected === opt.id && opt.available
                    ? "border-neutral-950 bg-stone-50"
                    : "border-stone-200 hover:border-stone-300",
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={opt.id}
                  checked={selected === opt.id}
                  disabled={!opt.available}
                  onChange={() => setSelected(opt.id)}
                  className="accent-neutral-950"
                />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-stone-100 text-stone-700">
                  {METHOD_ICONS[opt.id]}
                </span>
                <span className="flex-1 text-sm font-medium text-neutral-900">{opt.label}</span>
                {opt.comingSoon && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 ring-1 ring-amber-200">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Soon
                  </span>
                )}
              </label>
            ))}
          </div>

          {/* Bank transfer details */}
          {selected === "bank_transfer" && selectedOption?.available && (
            <div className="rounded-[8px] border border-stone-200 bg-stone-50 p-4 text-sm">
              <p className="font-semibold text-neutral-900">Bank transfer details</p>
              <div className="mt-2 space-y-1 text-stone-600">
                <p>Bank: <strong>{BANK_DETAILS.bank}</strong></p>
                <p>Account: <strong>{BANK_DETAILS.accountNumber}</strong></p>
                <p>Name: <strong>{BANK_DETAILS.accountName}</strong></p>
                <p>Reference: <strong className="font-mono text-xs">{booking.id.slice(0, 8).toUpperCase()}</strong></p>
              </div>
            </div>
          )}

          {/* Redirect note for Stripe, MoMo, VNPay, ZaloPay */}
          {isRedirect && selectedOption?.available && REDIRECT_NOTES[selected] && (
            <div className="rounded-[8px] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
              {REDIRECT_NOTES[selected]}
            </div>
          )}

          {/* PayPal Buttons — rendered inline when PayPal is selected */}
          {isPayPal && selectedOption?.available && PAYPAL_CLIENT_ID && (
            <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: booking.currency ?? "VND" }}>
              <PaypalButtonsInner
                bookingId={booking.id}
                onSuccess={handlePaypalSuccess}
                onError={setError}
              />
            </PayPalScriptProvider>
          )}

          {isPayPal && !PAYPAL_CLIENT_ID && (
            <p className="rounded-[6px] bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-200">
              NEXT_PUBLIC_PAYPAL_CLIENT_ID is not configured.
            </p>
          )}

          {error && (
            <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function PaypalButtonsInner({
  bookingId,
  onSuccess,
  onError,
}: {
  bookingId: string;
  onSuccess: (booking: Booking) => void;
  onError: (msg: string) => void;
}) {
  return (
    <PayPalButtons
      style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
      createOrder={async () => {
        const { orderId } = await createPaypalOrder(bookingId);
        return orderId;
      }}
      onApprove={async (data) => {
        try {
          const updated = await capturePaypalPayment(bookingId, data.orderID);
          onSuccess(updated);
        } catch (e) {
          onError(e instanceof Error ? e.message : "PayPal capture failed.");
        }
      }}
      onError={(err) => {
        onError(String(err));
      }}
    />
  );
}
