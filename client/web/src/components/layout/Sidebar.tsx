"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, LogOut, MapPinned, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/hooks";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const adminLinks = [
  { href: ROUTES.admin, label: "Overview", icon: LayoutDashboard },
  { href: ROUTES.adminComplexes, label: "Complexes", icon: Building2 },
  { href: ROUTES.adminFields, label: "Fields", icon: MapPinned },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-0 hidden w-64 border-r border-stone-200 bg-white/76 p-4 shadow-[12px_0_48px_rgba(23,23,23,0.04)] backdrop-blur-xl lg:flex lg:flex-col">
        <Link className="flex items-center gap-3 px-2" href={ROUTES.admin}>
          <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-neutral-950 text-white shadow-[0_12px_24px_rgba(23,23,23,0.18)]">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-semibold text-neutral-950">{APP_NAME}</span>
        </Link>
        <nav className="mt-8 grid gap-1">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              className={cn(
                "flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-neutral-950",
                pathname === link.href && "bg-neutral-950 text-white hover:bg-neutral-900 hover:text-white",
              )}
              href={link.href}
            >
              <link.icon className="h-4 w-4" aria-hidden="true" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-[8px] border border-stone-200 bg-white/82 p-3 shadow-[0_18px_48px_rgba(23,23,23,0.06)]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-stone-950 text-sm font-semibold text-white">
              {getInitials(user?.name ?? "Admin")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-950">
                {user?.name ?? "Admin"}
              </p>
              <p className="text-xs text-stone-500">Administrator</p>
            </div>
          </div>
          <Button className="mt-3 w-full" variant="secondary" onClick={logout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </aside>
      <div className="sticky top-0 z-30 border-b border-stone-200 bg-white/86 p-3 backdrop-blur-xl lg:hidden">
        <div className="flex gap-2 overflow-x-auto">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold text-stone-600",
                pathname === link.href
                  ? "bg-neutral-950 text-white"
                  : "hover:bg-stone-100",
              )}
              href={link.href}
            >
              <link.icon className="h-4 w-4" aria-hidden="true" />
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
