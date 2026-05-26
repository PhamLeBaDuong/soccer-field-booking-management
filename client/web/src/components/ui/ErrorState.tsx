"use client";

import { Button } from "@/components/ui/Button";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <h2 className="text-sm font-semibold text-red-800">Something went wrong</h2>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <Button className="mt-4" variant="secondary" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

