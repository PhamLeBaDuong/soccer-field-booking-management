"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/lib/auth/context";
import { ROUTES } from "@/lib/constants";
import { authDestination } from "@/lib/auth/returnTo";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.replace(authDestination(ROUTES.login, window.location.pathname + window.location.search));
    }
  }, [auth.loading, auth.user, router]);

  return {
    ...auth,
    authorized: Boolean(auth.user),
  };
}

export function useRequireAdmin() {
  const auth = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && auth.user && auth.user.role !== "admin") {
      router.replace(ROUTES.admin);
    }
  }, [auth.loading, auth.user, router]);

  return {
    ...auth,
    authorized: Boolean(auth.user && auth.user.role === "admin"),
  };
}

