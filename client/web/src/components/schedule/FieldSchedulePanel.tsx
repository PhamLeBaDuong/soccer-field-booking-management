"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, Plus, Swords } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { type ScheduleBooking } from "@/lib/api/adminSchedule";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, minutesToTime, timeToMinutes, todayInputValue } from "@/lib/utils/format";

type Props = {
  fieldId: string;
  fieldStart: string;
  fieldEnd: string;
  pricePerHour: number;
  currency?: string;
  /** fetch bookings for a given (fieldId, date) */
  fetchSchedule: (fieldId: string, date: string) => Promise<ScheduleBooking[]>;
  /** optional: save a match result */
  saveResult?: (matchId: string, homeScore: number, awayScore: number, note?: string) => Promise<void>;
  /** optional: create a manual / walk-in booking */
  createManual?: (fieldId: string, payload: {
    date: string; startTime: string; endTime: string;
    customerName?: string; note?: string;
  }) => Promise<void>;
};

export function FieldSchedulePanel({
  fieldId, fieldStart, fieldEnd, pricePerHour, currency,
  fetchSchedule, saveResult, createManual,
}: Props) {
  const { showToast } = useToast();
  const [date, setDate]             = useState(todayInputValue());
  const [slots, setSlots]           = useState<ScheduleBooking[]>([]);
  const [loadingSlots, setLoading]  = useState(false);
  const [selected, setSelected]     = useState<ScheduleBooking | null>(null);
  const [showManual, setShowManual] = useState(false);

  // Result form
  const [homeScore,   setHomeScore]   = useState("");
  const [awayScore,   setAwayScore]   = useState("");
  const [resultNote,  setResultNote]  = useState("");
  const [savingRes,   setSavingRes]   = useState(false);

  // Manual booking form
  const [manualStart,    setManualStart]    = useState("08:00");
  const [manualEnd,      setManualEnd]      = useState("09:00");
  const [manualCustomer, setManualCustomer] = useState("");
  const [manualNote,     setManualNote]     = useState("");
  const [savingManual,   setSavingManual]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSlots(await fetchSchedule(fieldId, date)); }
    catch { setSlots([]); }
    finally { setLoading(false); }
  }, [fieldId, date, fetchSchedule]);

  useEffect(() => { load(); }, [load]);

  function selectSlot(b: ScheduleBooking) {
    if (selected?.id === b.id) { setSelected(null); return; }
    setSelected(b);
    setShowManual(false);
    setHomeScore(b.match.homeScore !== null ? String(b.match.homeScore) : "");
    setAwayScore(b.match.awayScore !== null ? String(b.match.awayScore) : "");
    setResultNote(b.match.resultNote ?? "");
  }

  async function handleSaveResult() {
    if (!selected || !saveResult) return;
    const h = Number(homeScore), a = Number(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      showToast("Enter valid scores.", "error"); return;
    }
    setSavingRes(true);
    try {
      await saveResult(selected.matchId, h, a, resultNote || undefined);
      showToast("Result saved.");
      setSelected(null);
      await load();
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed.", "error"); }
    finally { setSavingRes(false); }
  }

  async function handleManualBooking() {
    if (!createManual) return;
    if (!manualStart || !manualEnd) { showToast("Pick a time range.", "error"); return; }
    setSavingManual(true);
    try {
      await createManual(fieldId, {
        date,
        startTime:    manualStart,
        endTime:      manualEnd,
        customerName: manualCustomer || undefined,
        note:         manualNote    || undefined,
      });
      showToast("Manual booking created.");
      setShowManual(false);
      setManualStart("08:00"); setManualEnd("09:00");
      setManualCustomer(""); setManualNote("");
      await load();
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed.", "error"); }
    finally { setSavingManual(false); }
  }

  // ─── Timeline geometry ────────────────────────────────────────────────────────
  let openMin  = timeToMinutes(fieldStart);
  let closeMin = timeToMinutes(fieldEnd);
  if (closeMin <= openMin) closeMin += 24 * 60;
  const totalMin = closeMin - openMin;

  const hourLabels: string[] = [];
  for (let m = openMin; m <= closeMin; m += 60) hourLabels.push(minutesToTime(m));

  function slotGeometry(b: ScheduleBooking) {
    let s = timeToMinutes(new Date(b.startTime).toISOString().slice(11, 16));
    let e = timeToMinutes(new Date(b.endTime).toISOString().slice(11, 16));
    if (s < openMin) s += 24 * 60;
    if (e <= openMin) e += 24 * 60;
    return {
      left:  ((s - openMin) / totalMin) * 100,
      width: ((e - s)       / totalMin) * 100,
    };
  }

  const isPast    = (b: ScheduleBooking) => new Date(b.endTime) < new Date();
  const hasResult = (b: ScheduleBooking) => b.match.homeScore !== null && b.match.awayScore !== null;

  const slotLabel = (b: ScheduleBooking) =>
    b.match.source === "manual"
      ? (b.match.resultNote || "Walk-in")
      : (b.match.matchPost?.team.name ?? `Lobby`);

  return (
    <div className="space-y-4">
      {/* Date picker + Add manual booking */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-stone-500" aria-hidden="true" />
          <Input
            type="date"
            label=""
            value={date}
            min={undefined}
            onChange={(e) => { setDate(e.target.value); setSelected(null); setShowManual(false); }}
            className="w-40"
          />
        </div>
        {createManual && (
          <Button variant="secondary" onClick={() => { setShowManual((v) => !v); setSelected(null); }}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Manual booking
          </Button>
        )}
      </div>

      {/* Timeline track */}
      <div>
        {/* Hour labels */}
        <div className="relative h-4">
          {hourLabels.map((label, i) => (
            <span
              key={`hour-${i}`}
              className="absolute text-[10px] font-mono text-stone-400 -translate-x-1/2"
              style={{ left: hourLabels.length > 1 ? `${(i / (hourLabels.length - 1)) * 100}%` : "0%" }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Track */}
        <div className="relative mt-1 h-14 overflow-hidden rounded-[8px] bg-stone-100 ring-1 ring-stone-200">
          {loadingSlots && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-stone-400">Loading…</span>
            </div>
          )}
          {!loadingSlots && slots.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-stone-400">No bookings — field is open all day</span>
            </div>
          )}
          {slots.map((b) => {
            const { left, width } = slotGeometry(b);
            const done = isPast(b);
            const hasRes = hasResult(b);
            const isManual = b.match.source === "manual";

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => selectSlot(b)}
                style={{ left: `${left}%`, width: `${width}%` }}
                className={cn(
                  "absolute top-1 bottom-1 rounded-[6px] px-2 text-left text-xs font-semibold overflow-hidden transition-all",
                  selected?.id === b.id && "ring-2 ring-amber-400",
                  isManual
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : hasRes
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : done
                        ? "bg-neutral-700 text-white hover:bg-neutral-800"
                        : "bg-sky-500 text-white hover:bg-sky-600",
                )}
              >
                <span className="block truncate leading-tight">{slotLabel(b)}</span>
                {hasRes && (
                  <span className="block font-mono text-[10px] text-white/80">
                    {b.match.homeScore}–{b.match.awayScore}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] font-semibold text-stone-500">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-sky-500"/>Upcoming</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-neutral-700"/>Played</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500"/>Result recorded</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500"/>Walk-in</span>
        </div>
      </div>

      {/* Manual booking form */}
      {showManual && createManual && (
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-sm font-semibold text-amber-900">Add walk-in / manual booking</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input label="Start (HH:MM)" placeholder="08:00"
              value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
            <Input label="End (HH:MM)" placeholder="10:00"
              value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
            <Input label="Customer name (opt.)" placeholder="Nguyen Van A"
              value={manualCustomer} onChange={(e) => setManualCustomer(e.target.value)} />
            <Input label="Note (opt.)" placeholder="Paid cash"
              value={manualNote} onChange={(e) => setManualNote(e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button loading={savingManual} onClick={handleManualBooking}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Confirm booking
            </Button>
            <Button variant="secondary" type="button" onClick={() => setShowManual(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Selected slot detail + result form */}
      {selected && (
        <div className="rounded-[8px] border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-neutral-950">
                <Swords className="h-4 w-4 text-stone-400" aria-hidden="true" />
                {slotLabel(selected)}
              </p>
              <p className="mt-0.5 font-mono text-xs text-stone-500">
                {new Date(selected.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {new Date(selected.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                Revenue: <span className="font-mono">{formatCurrency(selected.totalPrice, selected.currency)}</span>
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)}
              className="rounded p-1 text-stone-400 hover:bg-stone-200 text-lg leading-none">×</button>
          </div>

          {/* Result form (only for non-manual matches) */}
          {saveResult && selected.match.source !== "manual" && (
            <div className="mt-4 border-t border-stone-200 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase text-stone-500">
                {hasResult(selected) ? "Update result" : "Record match result"}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Input label="Home score" type="number" min={0}
                  value={homeScore}  onChange={(e) => setHomeScore(e.target.value)} />
                <Input label="Away score" type="number" min={0}
                  value={awayScore}  onChange={(e) => setAwayScore(e.target.value)} />
                <Input label="Note (opt.)" placeholder="Penalty shootout…"
                  value={resultNote} onChange={(e) => setResultNote(e.target.value)} />
              </div>
              <Button className="mt-3" loading={savingRes} onClick={handleSaveResult}>
                <Check className="h-4 w-4" aria-hidden="true" />
                Save result
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
