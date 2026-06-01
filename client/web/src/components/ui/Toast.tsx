"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
  exiting: boolean;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_DELAY = 5000;
const EXIT_DURATION = 260;

const toneConfig: Record<ToastTone, { icon: typeof CheckCircle2; classes: string }> = {
  success: {
    icon: CheckCircle2,
    classes: "border-emerald-200 bg-white text-emerald-800 shadow-[0_4px_24px_rgba(16,185,129,0.12)]",
  },
  error: {
    icon: XCircle,
    classes: "border-red-200 bg-white text-red-800 shadow-[0_4px_24px_rgba(220,38,38,0.12)]",
  },
  info: {
    icon: Info,
    classes: "border-sky-200 bg-white text-sky-800 shadow-[0_4px_24px_rgba(14,165,233,0.12)]",
  },
};

const iconColor: Record<ToastTone, string> = {
  success: "text-emerald-500",
  error: "text-red-500",
  info: "text-sky-500",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, EXIT_DURATION);
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message, tone, exiting: false }]);
      window.setTimeout(() => dismiss(id), DISMISS_DELAY);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-4 top-20 z-[60] flex flex-col gap-2"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const { icon: Icon, classes } = toneConfig[toast.tone];
          return (
            <div
              key={toast.id}
              className={cn(
                "flex w-[min(340px,calc(100vw-2rem))] items-start gap-3 rounded-[10px] border px-4 py-3",
                "backdrop-blur-sm",
                classes,
                toast.exiting ? "toast-exit" : "toast-enter",
              )}
              role="status"
            >
              <Icon
                className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor[toast.tone])}
                aria-hidden="true"
              />
              <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
