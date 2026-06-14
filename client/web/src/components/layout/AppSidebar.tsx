"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarCheck,
  DoorOpen,
  History,
  LayoutDashboard,
  MapPinned,
  Shield,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/hooks";
import { useI18n } from "@/lib/i18n/context";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

type NavLink = { href: string; label: string; icon: LucideIcon };

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();

  const navItems: NavLink[] = [
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
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stone-200/70 bg-white/90 shadow-[12px_0_48px_rgba(23,23,23,0.04)] backdrop-blur-xl transition-transform duration-200",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <Link
          href={ROUTES.dashboard}
          onClick={onClose}
          className="flex h-16 shrink-0 items-center gap-3 border-b border-stone-200/70 px-5"
        >
          <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-neutral-950 text-white shadow-[0_12px_24px_rgba(23,23,23,0.18)]">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold text-neutral-950">{APP_NAME}</span>
        </Link>

        {/* Nav links */}
        <nav className="grid flex-1 gap-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href) && item.href !== ROUTES.home;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-neutral-950 text-white hover:bg-neutral-900"
                    : "text-stone-600 hover:bg-stone-100 hover:text-neutral-950",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
