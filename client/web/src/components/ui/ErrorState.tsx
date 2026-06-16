"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";

export function ErrorState({
  message,
  title,
  retryLabel,
  onRetry,
}: {
  message: string;
  title?: string;
  retryLabel?: string;
  onRetry: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-[8px] border border-red-200 bg-red-50/90 p-5 shadow-[0_16px_40px_rgba(127,29,29,0.08)]">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800">
        <TriangleAlert className="h-4 w-4" aria-hidden="true" />
        {title ?? t("common.error")}
      </h2>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <Button className="mt-4" variant="secondary" onClick={onRetry}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {retryLabel ?? t("common.retry")}
      </Button>
    </div>
  );
}
