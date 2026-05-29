"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({
  label,
  error,
  helper,
  leadingIcon,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helper?: ReactNode;
  leadingIcon?: ReactNode;
}) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      {label ? (
        <span className="text-sm font-semibold text-neutral-900">{label}</span>
      ) : null}
      <span className="relative block">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
            {leadingIcon}
          </span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            "w-full rounded-[8px] border border-stone-300/90 bg-white/86 px-3 py-2.5 text-sm text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
            "placeholder:text-stone-400 focus:border-green-700/70 focus:outline-none focus:ring-4 focus:ring-green-700/10",
            leadingIcon ? "pl-10" : undefined,
            error && "border-red-300 focus:border-red-500 focus:ring-red-500/10",
            className,
          )}
          {...props}
        />
      </span>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {!error && helper ? (
        <p className="text-xs text-stone-500">{helper}</p>
      ) : null}
    </label>
  );
}
