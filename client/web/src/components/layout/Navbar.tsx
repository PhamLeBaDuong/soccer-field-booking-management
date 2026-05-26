"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MobileNav, type NavItem } from "@/components/layout/MobileNav";
import { buttonClasses } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/hooks";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function Logo() {
  return (
    <Link className="flex items-center gap-2" href={ROUTES.dashboard}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-green-600 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 5v14M3 12h18M7 9h2M15 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-base font-semibold text-gray-900">{APP_NAME}</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems: NavItem[] = [
    { href: ROUTES.dashboard, label: "Dashboard" },
    { href: ROUTES.fields, label: "Fields" },
    { href: ROUTES.bookings, label: "My Bookings" },
    { href: ROUTES.matching, label: "Matching" },
    ...(user?.role === "admin" ? [{ href: ROUTES.admin, label: "Admin" }] : []),
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                pathname.startsWith(item.href) &&
                  item.href !== ROUTES.home &&
                  "bg-green-50 text-green-700",
              )}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                onClick={() => setMenuOpen((current) => !current)}
                type="button"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
                  {getInitials(user.name || user.username)}
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {user.name || user.username}
                </span>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                  <Link
                    className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    href={ROUTES.dashboard}
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  {user.role === "admin" ? (
                    <Link
                      className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      href={ROUTES.admin}
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  ) : null}
                  <button
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={logout}
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link className={buttonClasses("primary", "sm")} href={ROUTES.login}>
              Login
            </Link>
          )}
        </div>
        <MobileNav items={navItems} user={user} onLogout={logout} />
      </div>
    </header>
  );
}

