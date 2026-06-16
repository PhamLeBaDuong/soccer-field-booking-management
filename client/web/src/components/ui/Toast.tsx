"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_DELAY = 5000;

const toneConfig: Record<ToastTone, { icon: typeof CheckCircle2; classes: string; iconColor: string }> = {
  success: {
    icon: CheckCircle2,
    classes: "border-emerald-200 bg-white text-emerald-800 shadow-[0_4px_24px_rgba(16,185,129,0.12)]",
    iconColor: "text-emerald-500",
  },
  error: {
    icon: XCircle,
    classes: "border-red-200 bg-white text-red-800 shadow-[0_4px_24px_rgba(220,38,38,0.12)]",
    iconColor: "text-red-500",
  },
  info: {
    icon: Info,
    classes: "border-sky-200 bg-white text-sky-800 shadow-[0_4px_24px_rgba(14,165,233,0.12)]",
    iconColor: "text-sky-500",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message, tone }]);
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
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const { icon: Icon, classes, iconColor } = toneConfig[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.92 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "flex w-[min(340px,calc(100vw-2rem))] items-start gap-3 rounded-[10px] border px-4 py-3",
                  "backdrop-blur-sm",
                  classes,
                )}
                role="status"
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} aria-hidden="true" />
                <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
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
