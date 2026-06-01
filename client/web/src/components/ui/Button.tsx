"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-neutral-950 text-white shadow-[0_1px_2px_rgba(0,0,0,0.22),0_8px_20px_rgba(0,0,0,0.10)] hover:bg-neutral-800 hover:shadow-[0_1px_2px_rgba(0,0,0,0.26),0_12px_28px_rgba(0,0,0,0.14)] active:scale-[0.975] active:shadow-[0_1px_2px_rgba(0,0,0,0.18)] focus-visible:ring-neutral-950",
  secondary:
    "border border-stone-200 bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:border-stone-300 hover:bg-stone-50 hover:shadow-[0_1px_4px_rgba(0,0,0,0.08)] active:scale-[0.975] active:bg-stone-100 focus-visible:ring-neutral-900",
  ghost:
    "text-neutral-700 hover:bg-stone-100 hover:text-neutral-950 active:scale-[0.975] active:bg-stone-200 focus-visible:ring-neutral-900",
  danger:
    "bg-red-600 text-white shadow-[0_1px_2px_rgba(220,38,38,0.2),0_8px_20px_rgba(220,38,38,0.14)] hover:bg-red-700 hover:shadow-[0_1px_2px_rgba(220,38,38,0.24),0_12px_28px_rgba(220,38,38,0.18)] active:scale-[0.975] focus-visible:ring-red-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[8px] font-semibold transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
