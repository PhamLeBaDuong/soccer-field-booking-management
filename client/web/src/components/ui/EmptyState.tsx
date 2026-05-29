"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-[8px] border border-dashed border-stone-300 bg-white/72 p-8 text-center shadow-[0_18px_48px_rgba(23,23,23,0.04)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-950 text-white shadow-[0_16px_32px_rgba(23,23,23,0.16)]">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-neutral-950">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-stone-500">{description}</p>
      {action ? (
        <Button className="mt-5" onClick={action.onClick}>
          {action.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
