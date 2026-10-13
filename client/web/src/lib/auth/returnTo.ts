export function safeReturnTo(value: string | null, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://pitchbook.invalid");
    if (url.origin !== "https://pitchbook.invalid" || ["/login", "/register"].includes(url.pathname)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}

export function authDestination(path: string, returnTo: string): string {
  return `${path}?next=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

export function getAuthReturnTo(): string {
  return typeof window === "undefined" ? "/dashboard"
    : safeReturnTo(new URLSearchParams(window.location.search).get("next"));
}
