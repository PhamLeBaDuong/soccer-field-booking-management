"use client";
import { Input } from "@/components/ui/Input";
import type { BookingRepeat } from "@/lib/utils/reservations";

export function RepeatBookingFields({ date, repeat, onChange }: {
  date: string; repeat: BookingRepeat | undefined; onChange: (value: BookingRepeat | undefined) => void;
}) {
  return <div className="space-y-3">
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">Repeat</span>
      <select className="select-control" value={repeat?.frequency ?? "none"} onChange={event => onChange(event.target.value === "none" ? undefined : {
        frequency: event.target.value as BookingRepeat["frequency"], until: repeat?.until ?? date,
      })}>
        <option value="none">Does not repeat</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
    </label>
    {repeat && <>
      <Input label="End date" type="date" min={date} value={repeat.until} onChange={event => onChange({ ...repeat, until: event.target.value })} />
      <p className="text-xs text-stone-500">Every date is reserved when you confirm. If any slot is unavailable, nothing is booked.</p>
      {repeat.frequency === "monthly" && Number(date.slice(-2)) > 28 && <p className="text-xs text-stone-500">Months without this date are skipped.</p>}
    </>}
  </div>;
}
