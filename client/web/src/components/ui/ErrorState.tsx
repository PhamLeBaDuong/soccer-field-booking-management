"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[8px] border border-red-200 bg-red-50/90 p-5 shadow-[0_16px_40px_rgba(127,29,29,0.08)]">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800">
        <TriangleAlert className="h-4 w-4" aria-hidden="true" />
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <Button className="mt-4" variant="secondary" onClick={onRetry}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}
