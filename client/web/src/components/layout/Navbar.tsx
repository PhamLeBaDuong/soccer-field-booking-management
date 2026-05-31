"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  CalendarCheck,
  ChevronDown,
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPinned,
  MessageCircle,
  Shield,
  Trophy,
  UserRound,
  Users,
  UsersRound,
  Swords,
  DoorOpen,
} from "lucide-react";
import { MobileNav, type NavItem } from "@/components/layout/MobileNav";
import { buttonClasses } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/hooks";
import { useI18n } from "@/lib/i18n/context";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function Logo() {
  return (
    <Link className="flex items-center gap-3" href={ROUTES.dashboard}>
      <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-neutral-950 text-white shadow-[0_12px_24px_rgba(23,23,23,0.18)]">
        <Trophy className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold text-neutral-950">{APP_NAME}</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems: NavItem[] = [
    { href: ROUTES.dashboard, label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: ROUTES.fields,    label: t("nav.fields"),    icon: MapPinned },
    { href: ROUTES.bookings,  label: t("nav.bookings"),  icon: CalendarCheck },
    { href: ROUTES.teams,     label: t("nav.teams"),     icon: Users },
    { href: ROUTES.matching,  label: t("nav.matches"),   icon: Swords },
    { href: ROUTES.lobbies,   label: t("nav.lobbies"),   icon: DoorOpen },
    { href: ROUTES.history,   label: t("nav.history"),   icon: History },
    { href: ROUTES.myVenues,  label: t("nav.myVenues"),  icon: Building2 },
    ...(user?.role === "admin" ? [{ href: ROUTES.admin, label: t("nav.admin"), icon: Shield }] : []),
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-stone-200/70 bg-white/76 shadow-[0_8px_30px_rgba(23,23,23,0.05)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={cn(
                "flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 hover:text-neutral-950",
                pathname.startsWith(item.href) &&
                  item.href !== ROUTES.home &&
                  "bg-neutral-950 text-white hover:bg-neutral-900 hover:text-white",
              )}
              href={item.href}
            >
              {item.icon ? <item.icon className="h-4 w-4" aria-hidden="true" /> : null}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {/* Language toggle */}
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1 rounded-[8px] border border-stone-200 bg-white/80 px-2.5 py-1.5 text-xs font-bold text-neutral-700 hover:bg-white"
            title={lang === "en" ? "Chuyển sang Tiếng Việt" : "Switch to English"}
          >
            <span className={cn(lang === "en" && "text-neutral-950", lang !== "en" && "text-stone-400")}>EN</span>
            <span className="text-stone-300">|</span>
            <span className={cn(lang === "vi" && "text-neutral-950", lang !== "vi" && "text-stone-400")}>VI</span>
          </button>
          {user ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-green-700"
                onClick={() => setMenuOpen((current) => !current)}
                type="button"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-stone-950 text-sm font-semibold text-white">
                  {getInitials(user.name || user.username)}
                </span>
                <span className="text-sm font-semibold text-neutral-800">
                  {user.name || user.username}
                </span>
                <ChevronDown className="h-4 w-4 text-stone-500" aria-hidden="true" />
              </button>
              {menuOpen ? (
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
                  {user.role === "admin" ? (
                    <Link
                      className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-stone-100"
                      href={ROUTES.admin}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4 text-stone-500" aria-hidden="true" />
                      {t("nav.admin")}
                    </Link>
                  ) : null}
                  <button
                    className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    onClick={logout}
                    type="button"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {t("nav.logout")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link className={buttonClasses("primary", "sm")} href={ROUTES.login}>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {t("nav.login")}
            </Link>
          )}
        </div>
        <MobileNav items={navItems} user={user} onLogout={logout} />
      </div>
    </header>
  );
}
