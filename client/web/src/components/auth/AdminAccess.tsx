"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { useRequireAdmin } from "@/lib/auth/hooks";

export function AdminAccess({ children }: { children: React.ReactNode }) {
  const { loading, authorized } = useRequireAdmin();
  if (loading || !authorized) return <Skeleton className="h-80" />;
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>;
}
