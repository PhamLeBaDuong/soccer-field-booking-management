"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.activeElement as HTMLElement | null;
    const firstInput = panelRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    firstInput?.focus();

    return () => previous?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
      return;
    }

    if (event.key !== "Tab" || !panelRef.current) {
      return;
    }

    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      ),
    ).filter((element) => !element.hasAttribute("disabled"));

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  }

  return (
    <div
      className="reveal-fade fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={cn(
          "modal-enter max-h-[90vh] w-full max-w-xl overflow-hidden bg-white",
          "rounded-[10px] border border-stone-200/80 shadow-[0_8px_16px_rgba(0,0,0,0.08),0_32px_80px_rgba(0,0,0,0.18)]",
        )}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 id="modal-title" className="text-base font-semibold text-neutral-950">
            {title}
          </h2>
          <button
            className="rounded-[6px] p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-green-700"
            onClick={onClose}
            type="button"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="border-t border-stone-100 bg-stone-50/80 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
