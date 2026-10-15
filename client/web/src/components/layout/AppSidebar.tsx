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
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/hooks";
import { useI18n } from "@/lib/i18n/context";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { isManagementRoute, isNavigationActive, sectionNavigation } from "@/lib/navigation";

type NavLink = { href: string; label: string; icon: LucideIcon };

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();

  const management = isManagementRoute(pathname);
  const icons: Record<string, LucideIcon> = { dashboard: LayoutDashboard, fields: MapPinned, bookings: CalendarCheck,
    teams: Users, matches: Swords, lobbies: DoorOpen, history: History, venues: Building2 };
  const navItems: NavLink[] = sectionNavigation(management, user?.role === "admin")
    .map(item => ({ href: item.href, label: t(item.label), icon: icons[item.icon] }));

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
          "app-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-hidden border-r border-stone-200/70 bg-white/90 shadow-[12px_0_48px_rgba(23,23,23,0.04)] backdrop-blur-xl transition-[width,transform] duration-200 motion-reduce:transition-none",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <Link
          href={management ? ROUTES.admin : ROUTES.home}
          aria-label={APP_NAME}
          onClick={onClose}
          className="flex h-16 shrink-0 items-center gap-3 border-b border-stone-200/70 px-5"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-neutral-950 text-white shadow-[0_12px_24px_rgba(23,23,23,0.18)]">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="app-sidebar-label whitespace-nowrap text-base font-semibold text-neutral-950">{APP_NAME}</span>
        </Link>

        {/* Nav links */}
        <nav aria-label={t(management ? "nav.managementSection" : "nav.bookingSection")} className="flex flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = isNavigationActive(pathname, item.href) || (item.href === ROUTES.home && isNavigationActive(pathname, ROUTES.fields));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={onClose}
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-[8px] px-4 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-neutral-950 text-white hover:bg-neutral-900"
                    : "text-stone-600 hover:bg-stone-100 hover:text-neutral-950",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="app-sidebar-label whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
