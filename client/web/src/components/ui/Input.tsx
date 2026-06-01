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
            "w-full rounded-[8px] border border-stone-300/80 bg-white px-3 py-2.5 text-sm text-neutral-950",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150",
            "placeholder:text-stone-400",
            "focus:border-green-700/60 focus:outline-none focus:ring-4 focus:ring-green-700/15",
            leadingIcon ? "pl-10" : undefined,
            error && "border-red-300 focus:border-red-500 focus:ring-red-500/15",
            className,
          )}
          {...props}
        />
      </span>
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : null}
      {!error && helper ? (
        <p className="text-xs text-stone-500">{helper}</p>
      ) : null}
    </label>
  );
}
