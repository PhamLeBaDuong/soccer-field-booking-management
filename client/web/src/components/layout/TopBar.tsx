"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Shield,
  UserRound,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/hooks";
import { useI18n } from "@/lib/i18n/context";
import { ROUTES } from "@/lib/constants";
import { getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-14 border-b border-stone-200/70 bg-white/76 shadow-[0_8px_30px_rgba(23,23,23,0.05)] backdrop-blur-xl lg:pl-64">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
        {/* Hamburger (mobile only) */}
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-[8px] p-2 text-neutral-800 hover:bg-stone-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Spacer pushes controls to the right */}
        <div className="flex-1" />

        {/* Language toggle */}
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1 rounded-[8px] border border-stone-200 bg-white/80 px-2.5 py-1.5 text-xs font-bold text-neutral-700 hover:bg-white"
          title={lang === "en" ? "Chuyển sang Tiếng Việt" : "Switch to English"}
        >
          <span className={lang === "en" ? "text-neutral-950" : "text-stone-400"}>EN</span>
          <span className="text-stone-300">|</span>
          <span className={lang === "vi" ? "text-neutral-950" : "text-stone-400"}>VI</span>
        </button>

        {/* Profile menu */}
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((c) => !c)}
              className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-green-700"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-stone-950 text-sm font-semibold text-white">
                {getInitials(user.name || user.username)}
              </span>
              <span className="hidden text-sm font-semibold text-neutral-800 sm:block">
                {user.name || user.username}
              </span>
              <ChevronDown className="h-4 w-4 text-stone-500" aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-[8px] border border-stone-200 bg-white/95 p-2 shadow-[0_18px_48px_rgba(23,23,23,0.12)] backdrop-blur-xl">
                <Link
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-stone-100"
                  href={ROUTES.dashboard}
                  onClick={() => setMenuOpen(false)}
                >
                  <UserRound className="h-4 w-4 text-stone-500" aria-hidden="true" />
                  {t("nav.profile")}
                </Link>
                <Link
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-stone-100"
                  href={ROUTES.friends}
                  onClick={() => setMenuOpen(false)}
                >
                  <MessageCircle className="h-4 w-4 text-stone-500" aria-hidden="true" />
                  {t("nav.friends")}
                </Link>
                {user.role === "admin" && (
                  <Link
                    className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-stone-100"
                    href={ROUTES.admin}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4 text-stone-500" aria-hidden="true" />
                    {t("nav.admin")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t("nav.logout")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link className={buttonClasses("primary", "sm")} href={ROUTES.login}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {t("nav.login")}
          </Link>
        )}
      </div>
    </header>
  );
}
