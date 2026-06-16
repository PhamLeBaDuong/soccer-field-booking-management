"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getMeRequest, loginRequest, registerRequest } from "@/lib/api/auth";
import { normalizeUser } from "@/lib/api/normalizers";
import { ROUTES } from "@/lib/constants";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { RegisterPayload, User, UserRole } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

type JwtPayload = {
  id?: string;
  userId?: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function parseToken(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(
      window.atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as unknown;

    if (typeof decoded !== "object" || decoded === null) {
      return null;
    }

    const record = decoded as Record<string, unknown>;
    return {
      id: typeof record.id === "string" ? record.id : undefined,
      userId: typeof record.userId === "string" ? record.userId : undefined,
      username:
        typeof record.username === "string" ? record.username : undefined,
      name: typeof record.name === "string" ? record.name : undefined,
      email: typeof record.email === "string" ? record.email : undefined,
      phone: typeof record.phone === "string" ? record.phone : undefined,
      role: record.role === "admin" ? "admin" : "player",
    };
  } catch {
    return null;
  }
}

function userFromToken(token: string): User {
  const payload = parseToken(token);
  const username = payload?.username ?? "player";

  return {
    id: payload?.id ?? payload?.userId ?? "demo-user",
    name: payload?.name ?? username,
    username,
    email: payload?.email ?? "",
    phone: payload?.phone ?? "",
    role: payload?.role ?? "player",
  };
}

function mergeTokenUser(token: string, user: User): User {
  const tokenUser = userFromToken(token);

  return normalizeUser({
    ...tokenUser,
    ...user,
    id: user.id || tokenUser.id,
    role: user.role || tokenUser.role,
    username: user.username || tokenUser.username,
    name: user.name || tokenUser.name,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      setUser(null);
      setToken(null);
      return;
    }

    setToken(storedToken);
    connectSocket(storedToken);
    try {
      const apiUser = await getMeRequest();
      setUser(mergeTokenUser(storedToken, apiUser));
    } catch {
      setUser(userFromToken(storedToken));
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const response = await loginRequest(identifier, password);
      localStorage.setItem("token", response.token);
      setToken(response.token);
      connectSocket(response.token);
      setUser(
        response.user
          ? mergeTokenUser(response.token, response.user)
          : userFromToken(response.token),
      );
    },
    [],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await registerRequest(payload);
      await login(payload.username, payload.password);
    },
    [login],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    disconnectSocket();
    setToken(null);
    setUser(null);
    router.push(ROUTES.login);
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [loading, login, logout, refreshUser, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

