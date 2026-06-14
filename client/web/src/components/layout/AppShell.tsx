"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const hideNav =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/admin");

  if (hideNav) {
    return <main>{children}</main>;
  }

  return (
    <div className="app-background min-h-screen">
      <AppSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <TopBar onMenuClick={() => setDrawerOpen(true)} />
      <main className="pt-14 lg:pl-64">{children}</main>
    </div>
  );
}
