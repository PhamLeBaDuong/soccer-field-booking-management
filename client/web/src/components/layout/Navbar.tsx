"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
      <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-neutral-950 text-white shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_20px_rgba(0,0,0,0.12)]">
        <Trophy className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-[-0.01em] text-neutral-950">
        {APP_NAME}
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const navItems: NavItem[] = [
    { href: ROUTES.dashboard, label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: ROUTES.fields,    label: t("nav.fields"),    icon: MapPinned },
    { href: ROUTES.bookings,  label: t("nav.bookings"),  icon: CalendarCheck },
    { href: ROUTES.teams,     label: t("nav.teams"),     icon: Users },
    { href: ROUTES.matching,  label: t("nav.matches"),   icon: Swords },
    { href: ROUTES.lobbies,   label: t("nav.lobbies"),   icon: DoorOpen },
    { href: ROUTES.history,   label: t("nav.history"),   icon: History },
    { href: ROUTES.myVenues,  label: t("nav.myVenues"),  icon: Building2 },
    ...(user?.role === "admin"
      ? [{ href: ROUTES.admin, label: t("nav.admin"), icon: Shield }]
      : []),
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-stone-200/70 bg-white/76 shadow-[0_8px_30px_rgba(23,23,23,0.05)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: logo + nav links */}
        <div className="flex min-w-0 items-center gap-5">
          <Logo />
          <nav className="hidden items-center gap-0.5 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 hover:text-neutral-950",
                  pathname.startsWith(item.href) &&
                    item.href !== ROUTES.home &&
                    "bg-neutral-950 text-white hover:bg-neutral-900 hover:text-white",
                )}
                href={item.href}
              >
                {item.icon ? <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: language toggle + user menu */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {/* Language toggle */}
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-[7px] border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-stone-300 hover:bg-stone-50"
            title={lang === "en" ? "Chuyển sang Tiếng Việt" : "Switch to English"}
          >
            <span className={cn(lang === "en" ? "text-neutral-950" : "text-stone-400")}>EN</span>
            <span className="text-stone-300">|</span>
            <span className={cn(lang === "vi" ? "text-neutral-950" : "text-stone-400")}>VI</span>
          </button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-green-700/40"
                onClick={() => setMenuOpen((v) => !v)}
                type="button"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral-950 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.18)]">
                  {getInitials(user.name || user.username)}
                </span>
                <span className="max-w-[100px] truncate text-sm font-semibold text-neutral-800">
                  {user.name || user.username}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-stone-400 transition-transform duration-200",
                    menuOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-52 rounded-[10px] border border-stone-200/80 bg-white p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_48px_rgba(0,0,0,0.10)] backdrop-blur-xl">
                  <Link
                    className="flex items-center gap-2.5 rounded-[7px] px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-stone-50 hover:text-neutral-950"
                    href={ROUTES.dashboard}
                    onClick={() => setMenuOpen(false)}
                  >
                    <UserRound className="h-4 w-4 text-stone-400" aria-hidden="true" />
                    {t("nav.profile")}
                  </Link>
                  <Link
                    className="flex items-center gap-2.5 rounded-[7px] px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-stone-50 hover:text-neutral-950"
                    href={ROUTES.friends}
                    onClick={() => setMenuOpen(false)}
                  >
                    <MessageCircle className="h-4 w-4 text-stone-400" aria-hidden="true" />
                    {t("nav.friends")}
                  </Link>
                  {user.role === "admin" ? (
                    <Link
                      className="flex items-center gap-2.5 rounded-[7px] px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-stone-50 hover:text-neutral-950"
                      href={ROUTES.admin}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4 text-stone-400" aria-hidden="true" />
                      {t("nav.admin")}
                    </Link>
                  ) : null}
                  <div className="my-1 h-px bg-stone-100" />
                  <button
                    className="flex w-full items-center gap-2.5 rounded-[7px] px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
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
