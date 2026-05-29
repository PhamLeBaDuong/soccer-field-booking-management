"use client";

import Link from "next/link";
import { useState } from "react";
import { LogIn, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { User } from "@/lib/types";

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

  return (
    <div className="md:hidden">
      <button
        className="rounded-[8px] border border-stone-200 bg-white/70 p-2 text-neutral-800 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-label="Toggle navigation"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-16 border-b border-stone-200 bg-white/94 p-4 shadow-[0_18px_48px_rgba(23,23,23,0.1)] backdrop-blur-xl">
          <nav className="grid gap-2">
            {items.map((item) => (
              <Link
                key={item.href}
                className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-stone-100"
                href={item.href}
                onClick={() => setOpen(false)}
              >
                {item.icon ? (
                  <item.icon className="h-4 w-4 text-stone-500" aria-hidden="true" />
                ) : null}
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-gray-100 pt-4">
            {user ? (
              <Button className="w-full" variant="secondary" onClick={onLogout}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </Button>
            ) : (
              <Link
                className="flex items-center justify-center gap-2 rounded-[8px] bg-neutral-950 px-4 py-2 text-center text-sm font-semibold text-white"
                href="/login"
                onClick={() => setOpen(false)}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Login
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
