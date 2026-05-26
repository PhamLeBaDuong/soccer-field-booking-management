import { Badge } from "@/components/ui/Badge";
import type { BookingStatus } from "@/lib/types";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge status={status} />;
}

