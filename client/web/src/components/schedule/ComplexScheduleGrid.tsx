"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  type ComplexScheduleField,
  getComplexSchedule,
  createManualBooking,
} from "@/lib/api/venues";
import { setMatchResult } from "@/lib/api/adminSchedule";
import type { ScheduleBooking } from "@/lib/api/adminSchedule";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, minutesToTime, timeToMinutes, todayInputValue } from "@/lib/utils/format";

const PX_PER_HOUR = 64; // row height

export function ComplexScheduleGrid({
  complexId,
  canEditResult = true,
}: {
  complexId: string;
  canEditResult?: boolean;
}) {
  const { t, lang } = useI18n();
  const { showToast } = useToast();

  const [date, setDate]       = useState(todayInputValue());
  const [data, setData]       = useState<ComplexScheduleField[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ field: ComplexScheduleField; booking: ScheduleBooking } | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getComplexSchedule(complexId, date);
      setData(res.fields);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [complexId, date]);

  useEffect(() => { load(); }, [load]);

  // ── Time range across all fields ──────────────────────────────────────────────
  const { rangeStart, rangeEnd, hours } = useMemo(() => {
    if (data.length === 0) return { rangeStart: 6 * 60, rangeEnd: 23 * 60, hours: [] as number[] };
    let minStart = Infinity, maxEnd = -Infinity;
    for (const f of data) {
      const s = timeToMinutes(f.startTime);
      let e = timeToMinutes(f.endTime);
      if (e <= s) e += 24 * 60; // overnight
      minStart = Math.min(minStart, s);
      maxEnd   = Math.max(maxEnd, e);
    }
    // Snap to whole hours
    minStart = Math.floor(minStart / 60) * 60;
    maxEnd   = Math.ceil(maxEnd / 60) * 60;
    const hrs: number[] = [];
    for (let m = minStart; m <= maxEnd; m += 60) hrs.push(m);
    return { rangeStart: minStart, rangeEnd: maxEnd, hours: hrs };
  }, [data]);

  const totalMin = rangeEnd - rangeStart;
  const gridHeight = (totalMin / 60) * PX_PER_HOUR;

  function bookingGeometry(b: ScheduleBooking) {
    let s = timeToMinutes(b.startTime);
    let e = timeToMinutes(b.endTime);
    if (s < rangeStart) s += 24 * 60;
    if (e <= rangeStart) e += 24 * 60;
    const top    = ((s - rangeStart) / 60) * PX_PER_HOUR;
    const height = ((e - s) / 60) * PX_PER_HOUR;
    return { top, height: Math.max(height, 18) };
  }

  const slotLabel = (b: ScheduleBooking) =>
    b.match.source === "manual"
      ? (b.match.resultNote || t("schedule.walkIn"))
      : (b.match.matchPost?.team.name ?? b.user?.name ?? "Lobby");

  const hasResult = (b: ScheduleBooking) => b.match.homeScore !== null && b.match.awayScore !== null;
  const isPast    = (b: ScheduleBooking) => new Date(b.endTime) < new Date();

  // ── Date navigation ─────────────────────────────────────────────────────────
  function shiftDay(delta: number) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
    setSelected(null);
  }

  const dateLabel = useMemo(() => {
    const d = new Date(`${date}T00:00:00`);
    return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", {
      weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
    }).format(d);
  }, [date, lang]);

  return (
    <div>
      {/* Date navigator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftDay(-1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-50">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-44 rounded-[8px] border border-stone-200 bg-white px-4 py-2 text-center text-sm font-semibold text-neutral-950">
            {dateLabel}
          </span>
          <button type="button" onClick={() => shiftDay(1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-50">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => { setDate(todayInputValue()); setSelected(null); }}
            className="rounded-[8px] border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50">
            {t("common.today")}
          </button>
        </div>
        <Button variant="secondary" onClick={() => { setShowAdd((v) => !v); setSelected(null); }}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("schedule.addBooking")}
        </Button>
      </div>

      {/* Manual booking form */}
      {showAdd && (
        <ManualBookingForm
          fields={data}
          date={date}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); load(); }}
        />
      )}

      {/* Grid */}
      {loading ? (
        <Skeleton className="mt-4 h-96" />
      ) : data.length === 0 ? (
        <p className="mt-6 text-center text-sm text-stone-500">{t("schedule.noBookings")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[8px] border border-stone-200">
          <div className="flex min-w-max">
            {/* Hour gutter */}
            <div className="sticky left-0 z-10 w-14 shrink-0 bg-white">
              <div className="h-10 border-b border-r border-stone-200 bg-stone-50" />
              <div className="relative border-r border-stone-200" style={{ height: gridHeight }}>
                {hours.map((m, i) => (
                  <div key={m} className="absolute left-0 right-0 px-1 text-right text-[11px] font-mono text-stone-400"
                    style={{ top: i * PX_PER_HOUR - 6 }}>
                    {minutesToTime(m % (24 * 60))}
                  </div>
                ))}
              </div>
            </div>

            {/* Field columns */}
            {data.map((field) => (
              <div key={field.id} className="w-40 shrink-0 border-r border-stone-200 last:border-r-0">
                {/* Header */}
                <div className="flex h-10 items-center justify-center border-b border-stone-200 bg-stone-50 px-2 text-center text-xs font-semibold text-neutral-900">
                  <span className="truncate">{field.name}</span>
                </div>
                {/* Track */}
                <div className="relative" style={{ height: gridHeight }}>
                  {/* hour gridlines */}
                  {hours.map((m, i) => (
                    <div key={m} className="absolute left-0 right-0 border-b border-stone-100"
                      style={{ top: i * PX_PER_HOUR }} />
                  ))}
                  {/* bookings */}
                  {field.bookings.map((b) => {
                    const { top, height } = bookingGeometry(b);
                    const manual = b.match.source === "manual";
                    const res = hasResult(b);
                    const past = isPast(b);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelected({ field, booking: b })}
                        style={{ top: top + 2, height: height - 4 }}
                        className={cn(
                          "absolute left-1 right-1 overflow-hidden rounded-[6px] px-1.5 py-1 text-left text-[11px] font-semibold leading-tight transition-all",
                          selected?.booking.id === b.id && "ring-2 ring-amber-400",
                          manual
                            ? "bg-amber-400 text-amber-950 hover:bg-amber-500"
                            : res
                              ? "bg-emerald-400 text-emerald-950 hover:bg-emerald-500"
                              : past
                                ? "bg-stone-300 text-stone-700 hover:bg-stone-400"
                                : "bg-sky-400 text-sky-950 hover:bg-sky-500",
                        )}
                      >
                        <span className="block truncate">{slotLabel(b)}</span>
                        <span className="block font-mono text-[10px] opacity-80">
                          {timeRange(b)}
                        </span>
                        {res && (
                          <span className="block font-mono text-[10px]">
                            {b.match.homeScore}–{b.match.awayScore}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-stone-500">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-sky-400" />{t("schedule.legendUpcoming")}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-stone-300" />{t("schedule.legendPlayed")}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />{t("schedule.legendResult")}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />{t("schedule.legendWalkIn")}</span>
      </div>

      {/* Selected booking detail + result form */}
      {selected && (
        <BookingDetail
          field={selected.field}
          booking={selected.booking}
          canEditResult={canEditResult}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}

function timeRange(b: ScheduleBooking) {
  const s = timeToMinutes(b.startTime);
  const e = timeToMinutes(b.endTime);
  return `${minutesToTime(s % (24 * 60))}-${minutesToTime(e % (24 * 60))}`;
}

// ─── Manual booking form ────────────────────────────────────────────────────────

function ManualBookingForm({
  fields, date, onClose, onCreated,
}: {
  fields: ComplexScheduleField[];
  date: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [fieldId, setFieldId]   = useState(fields[0]?.id ?? "");
  const [start, setStart]       = useState("08:00");
  const [end, setEnd]           = useState("09:00");
  const [customer, setCustomer] = useState("");
  const [note, setNote]         = useState("");
  const [saving, setSaving]     = useState(false);

  async function submit() {
    if (!fieldId) { showToast(t("schedule.field"), "error"); return; }
    setSaving(true);
    try {
      await createManualBooking(fieldId, { date, startTime: start, endTime: end, customerName: customer || undefined, note: note || undefined });
      showToast(t("schedule.manualBooking"));
      onCreated();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed.", "error");
    } finally { setSaving(false); }
  }

  return (
    <div className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-4">
      <p className="mb-3 text-sm font-semibold text-amber-900">{t("schedule.manualBooking")}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-neutral-900">{t("schedule.field")}</span>
          <select className="select-control" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
            {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <Input label={t("common.start") + " (HH:MM)"} value={start} onChange={(e) => setStart(e.target.value)} />
        <Input label={t("common.end") + " (HH:MM)"} value={end} onChange={(e) => setEnd(e.target.value)} />
        <Input label={t("schedule.customerName")} value={customer} onChange={(e) => setCustomer(e.target.value)} />
        <Input label={t("schedule.note")} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button loading={saving} onClick={submit}>
          <Check className="h-4 w-4" aria-hidden="true" />{t("common.confirm")}
        </Button>
        <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
      </div>
    </div>
  );
}

// ─── Booking detail + result ──────────────────────────────────────────────────

function BookingDetail({
  field, booking, canEditResult, onClose, onSaved,
}: {
  field: ComplexScheduleField;
  booking: ScheduleBooking;
  canEditResult: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const has = booking.match.homeScore !== null && booking.match.awayScore !== null;
  const [home, setHome] = useState(has ? String(booking.match.homeScore) : "");
  const [away, setAway] = useState(has ? String(booking.match.awayScore) : "");
  const [note, setNote] = useState(booking.match.resultNote ?? "");
  const [saving, setSaving] = useState(false);

  const isManual = booking.match.source === "manual";

  async function save() {
    const h = Number(home), a = Number(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) { showToast(t("schedule.homeScore"), "error"); return; }
    setSaving(true);
    try {
      await setMatchResult(booking.matchId, h, a, note || undefined);
      showToast(t("schedule.saveResult"));
      onSaved();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed.", "error");
    } finally { setSaving(false); }
  }

  return (
    <div className="mt-4 rounded-[8px] border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-neutral-950">
            {field.name} · {isManual ? (booking.match.resultNote || t("schedule.walkIn")) : (booking.match.matchPost?.team.name ?? "Lobby")}
          </p>
          <p className="mt-0.5 font-mono text-xs text-stone-500">{timeRange(booking)}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {t("schedule.revenue")}: <span className="font-mono">{formatCurrency(booking.totalPrice, booking.currency)}</span>
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-stone-400 hover:bg-stone-200">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {canEditResult && !isManual && (
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase text-stone-500">
            {has ? t("schedule.updateResult") : t("schedule.recordResult")}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Input label={t("schedule.homeScore")} type="number" min={0} value={home} onChange={(e) => setHome(e.target.value)} />
            <Input label={t("schedule.awayScore")} type="number" min={0} value={away} onChange={(e) => setAway(e.target.value)} />
            <Input label={t("schedule.note")} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button className="mt-3" loading={saving} onClick={save}>
            <Check className="h-4 w-4" aria-hidden="true" />{t("schedule.saveResult")}
          </Button>
        </div>
      )}
    </div>
  );
}
