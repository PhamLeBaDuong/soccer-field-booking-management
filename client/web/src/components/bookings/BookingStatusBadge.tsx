"use client";

import { Badge } from "@/components/ui/Badge";
import type { BookingStatus } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useI18n();
  return <Badge status={status} label={t(`status.${status}`)} />;
}
