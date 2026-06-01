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
    <div className="flex min-h-72 flex-col items-center justify-center rounded-[10px] border border-dashed border-stone-300/80 bg-white/60 p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-neutral-950 text-white shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.12)]">
        {icon}
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-neutral-950">
        {title}
      </h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-stone-500">{description}</p>
      {action ? (
        <Button className="mt-6" onClick={action.onClick}>
          {action.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
