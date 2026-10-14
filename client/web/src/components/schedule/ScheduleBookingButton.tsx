"use client";

import { useId, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import type { ScheduleBooking } from "@/lib/api/adminSchedule";
import { formatCurrency } from "@/lib/utils/format";
import { reservationClock } from "@/lib/utils/reservations";

export function ScheduleBookingButton({ booking, label, fieldName, timeZone, children, ...props }: ComponentProps<"button"> & {
  booking: ScheduleBooking; label: string; fieldName?: string; timeZone: string;
}) {
  const id = useId();
  const [position, setPosition] = useState<{ left: number; top: number; above: boolean }>();
  const range = `${reservationClock(booking.startTime, timeZone)}–${reservationClock(booking.endTime, timeZone)}`;
  const type = booking.bookingType === "fixed" ? "Fixed booking" : "Direct booking";
  function show(button: HTMLButtonElement) {
    const rect = button.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 272)), top: rect.bottom + 8,
      above: rect.bottom + 220 > window.innerHeight });
  }
  return <>
    <button {...props} aria-label={`${fieldName ? `${fieldName}: ` : ""}${label}, ${range}, ${type}`}
      aria-describedby={position ? id : undefined}
      onMouseEnter={e => show(e.currentTarget)} onMouseLeave={() => setPosition(undefined)}
      onFocus={e => show(e.currentTarget)} onBlur={() => setPosition(undefined)}
      onKeyDown={e => { if (e.key === "Escape") setPosition(undefined); props.onKeyDown?.(e); }}>
      {children}
    </button>
    {position && createPortal(<div id={id} role="tooltip"
      className="pointer-events-none fixed z-50 w-64 rounded-lg border border-stone-200 bg-white p-3 text-xs text-stone-700 shadow-lg"
      style={{ left: position.left, top: position.above ? undefined : position.top,
        bottom: position.above ? window.innerHeight - position.top + 16 : undefined }}>
      <p className="font-semibold text-neutral-950">{label}</p>
      {fieldName && <p className="mt-1">{fieldName}</p>}
      <p className="mt-1 font-mono">{range}</p>
      <p className="mt-1">{type} · {booking.status}</p>
      <p className="mt-1">{formatCurrency(booking.totalPrice, booking.currency)}</p>
      {booking.user?.name && booking.user.name !== label && <p className="mt-1">{booking.user.name}</p>}
      {booking.note && booking.note !== label && <p className="mt-1 break-words">{booking.note}</p>}
    </div>, document.body)}
  </>;
}
