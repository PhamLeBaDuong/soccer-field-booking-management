"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { User } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
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
        className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-label="Toggle navigation"
      >
        <span className="block h-0.5 w-5 bg-current" />
        <span className="mt-1 block h-0.5 w-5 bg-current" />
        <span className="mt-1 block h-0.5 w-5 bg-current" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-16 border-b border-gray-200 bg-white p-4 shadow-lg">
          <nav className="grid gap-2">
            {items.map((item) => (
              <Link
                key={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                href={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-gray-100 pt-4">
            {user ? (
              <Button className="w-full" variant="secondary" onClick={onLogout}>
                Logout
              </Button>
            ) : (
              <Link
                className="block rounded-lg bg-green-600 px-4 py-2 text-center text-sm font-medium text-white"
                href="/login"
                onClick={() => setOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

