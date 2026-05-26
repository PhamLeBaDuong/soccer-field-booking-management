"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/hooks";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const adminLinks = [
  { href: ROUTES.admin, label: "Overview" },
  { href: ROUTES.adminComplexes, label: "Complexes" },
  { href: ROUTES.adminFields, label: "Fields" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-0 hidden w-60 border-r border-gray-200 bg-white p-4 lg:flex lg:flex-col">
        <Link className="flex items-center gap-2 px-2" href={ROUTES.admin}>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-green-600 text-white">
            <span className="text-sm font-bold">PB</span>
          </span>
          <span className="font-semibold text-gray-900">{APP_NAME}</span>
        </Link>
        <nav className="mt-8 grid gap-1">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                pathname === link.href && "bg-green-50 text-green-700",
              )}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
              {getInitials(user?.name ?? "Admin")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {user?.name ?? "Admin"}
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
          <Button className="mt-3 w-full" variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white p-3 lg:hidden">
        <div className="flex gap-2 overflow-x-auto">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-gray-600",
                pathname === link.href
                  ? "bg-green-50 text-green-700"
                  : "hover:bg-gray-50",
              )}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

