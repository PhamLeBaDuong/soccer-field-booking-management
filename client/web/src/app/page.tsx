"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? ROUTES.dashboard : ROUTES.login);
    }
  }, [loading, router, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Skeleton className="h-12 w-48" />
    </div>
  );
}
