"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/lib/auth/hooks";

export default function VenueManagementLayout({ children }: { children: React.ReactNode }) {
  const { loading, authorized } = useRequireAuth();
  if (loading || !authorized) return <div className="p-6"><Skeleton className="h-80" /></div>;
  return <>{children}</>;
}
