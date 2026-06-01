"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogIn, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

export function MobileNav({
  items,
  user,
  onLogout,
}: {
  items: NavItem[];
  user: User | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        className="rounded-[8px] border border-stone-200 bg-white p-2 text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-green-700/40"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={open ? "true" : "false"}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-16 border-b border-stone-200/70 bg-white/96 shadow-[0_8px_32px_rgba(0,0,0,0.10)] backdrop-blur-xl">
          <nav className="grid gap-0.5 p-3">
            {items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-neutral-950 text-white"
                      : "text-neutral-700 hover:bg-stone-100 hover:text-neutral-950",
                  )}
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  {item.icon ? (
                    <item.icon
                      className={cn("h-4 w-4", isActive ? "text-white/70" : "text-stone-400")}
                      aria-hidden="true"
                    />
                  ) : null}
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-stone-100 p-3">
            {user ? (
              <Button className="w-full" variant="secondary" onClick={onLogout}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </Button>
            ) : (
              <Link
                className="flex items-center justify-center gap-2 rounded-[8px] bg-neutral-950 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-colors hover:bg-neutral-800"
                href="/login"
                onClick={() => setOpen(false)}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
