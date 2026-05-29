"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRequireAdmin } from "@/lib/auth/hooks";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, authorized } = useRequireAdmin();

  if (loading || !authorized) {
    return (
      <div className="app-background p-6">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="mt-6 h-80" />
      </div>
    );
  }

  return (
    <div className="app-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
