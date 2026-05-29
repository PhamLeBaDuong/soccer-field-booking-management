"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/admin");

  return (
    <>
      {hideNavbar ? null : <Navbar />}
      <main className={hideNavbar ? "" : "app-background pt-16"}>{children}</main>
    </>
  );
}
