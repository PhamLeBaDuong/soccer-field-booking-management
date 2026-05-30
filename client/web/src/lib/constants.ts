export const APP_NAME = "PitchBook";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:5000";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  fields: "/fields",
  bookings: "/bookings",
  teams: "/teams",
  matching: "/matching",
  lobbies: "/lobbies",
  admin: "/admin",
  adminComplexes: "/admin/complexes",
  adminFields: "/admin/fields",
} as const;

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "canceled",
  "matching",
] as const;

export const FIELD_TYPES = ["5v5", "7v7", "11v11"] as const;

export const DEFAULT_CURRENCY = "VND";

