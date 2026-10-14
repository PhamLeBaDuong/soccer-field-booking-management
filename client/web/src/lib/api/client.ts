import { API_BASE_URL, ROUTES } from "@/lib/constants";
import type { ApiError } from "@/lib/types";
import { authDestination } from "@/lib/auth/returnTo";

type ErrorBody = {
  error?: string;
  message?: string;
};

export class ApiFetchError extends Error implements ApiError {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiFetchError";
    this.status = status;
  }
}

function isErrorBody(value: unknown): value is ErrorBody {
  return typeof value === "object" && value !== null;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isErrorBody(body)) {
      return body.error ?? body.message ?? response.statusText;
    }
  } catch {
    return response.statusText;
  }

  return response.statusText;
}

function handleUnauthorized(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("token");
  if (!window.location.pathname.startsWith(ROUTES.login)) {
    window.location.assign(authDestination(ROUTES.login, window.location.pathname + window.location.search));
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiFetchError(
      "Cannot reach the booking server. Check that the backend is running.",
      0,
    );
  }

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok) {
    throw new ApiFetchError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
