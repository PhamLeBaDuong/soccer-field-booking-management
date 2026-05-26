import type { ReactNode } from "react";
import type { BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const statusClasses: Record<BookingStatus, string> = {
  confirmed: "bg-green-100 text-green-700 ring-green-200",
  pending: "bg-amber-100 text-amber-700 ring-amber-200",
  canceled: "bg-red-100 text-red-700 ring-red-200",
  matching: "bg-blue-100 text-blue-700 ring-blue-200",
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

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        status
          ? statusClasses[status]
          : "bg-gray-100 text-gray-700 ring-gray-200",
        className,
      )}
    >
      {icon}
      {text.charAt(0).toUpperCase() + text.slice(1)}
    </span>
  );
}

