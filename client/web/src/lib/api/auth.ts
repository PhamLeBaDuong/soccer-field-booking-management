import { apiFetch } from "@/lib/api/client";
import { normalizeUser } from "@/lib/api/normalizers";
import type { LoginResponse, RegisterPayload, User } from "@/lib/types";

type LoginApiResponse = {
  token: string;
  user?: unknown;
};

export async function loginRequest(
  identifier: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiFetch<LoginApiResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username: identifier,
      email: identifier,
      password,
    }),
  });

  return {
    token: response.token,
    user: response.user ? normalizeUser(response.user) : undefined,
  };
}

export async function registerRequest(payload: RegisterPayload): Promise<User> {
  const response = await apiFetch<unknown>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeUser(response);
}

export async function getMeRequest(): Promise<User> {
  const response = await apiFetch<unknown>("/api/auth/me");
  return normalizeUser(response);
}

