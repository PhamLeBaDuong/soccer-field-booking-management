import type { ReactNode } from "react";
import { CheckCircle2, Clock, XCircle, Zap } from "lucide-react";
import type { BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const statusClasses: Record<BookingStatus, string> = {
  confirmed: "bg-emerald-50 text-emerald-800 ring-emerald-300/80",
  pending:   "bg-amber-50 text-amber-800 ring-amber-300/80",
  canceled:  "bg-red-50 text-red-700 ring-red-300/80",
  matching:  "bg-sky-50 text-sky-800 ring-sky-300/80",
};

const statusIcons: Record<BookingStatus, ReactNode> = {
  confirmed: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  pending:   <Clock className="h-3 w-3" aria-hidden="true" />,
  canceled:  <XCircle className="h-3 w-3" aria-hidden="true" />,
  matching:  <Zap className="h-3 w-3" aria-hidden="true" />,
};

export function Badge({
  status,
  label,
  icon,
  className,
}: {
  status?: BookingStatus;
  label?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const text = label ?? status ?? "";
  const autoIcon = status ? statusIcons[status] : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        status
          ? statusClasses[status]
          : "bg-stone-100 text-stone-700 ring-stone-300/80",
        className,
      )}
    >
      {icon ?? autoIcon}
      {text.charAt(0).toUpperCase() + text.slice(1)}
    </span>
  );
}
