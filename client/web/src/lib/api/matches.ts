import { apiFetch } from "@/lib/api/client";
import { normalizeField } from "@/lib/api/normalizers";
import type { Match } from "@/lib/types";

function normalizeMatch(raw: unknown): Match {
  if (typeof raw !== "object" || raw === null) throw new Error("Invalid match data");
  const r = raw as Record<string, unknown>;
  const fieldRaw = r.field
    ?? (typeof r.matchPost === "object" && r.matchPost !== null
        ? (r.matchPost as Record<string, unknown>).field
        : undefined);
  return {
    id:         String(r.id ?? ""),
    source:     (r.source as "post" | "lobby") ?? "post",
    status:     (r.status as "confirmed" | "canceled") ?? "confirmed",
    fieldId:    String(r.fieldId ?? ""),
    startTime:  String(r.startTime ?? ""),
    endTime:    String(r.endTime ?? ""),
    homeScore:  typeof r.homeScore === "number" ? r.homeScore : null,
    awayScore:  typeof r.awayScore === "number" ? r.awayScore : null,
    resultNote: typeof r.resultNote === "string" ? r.resultNote : null,
    matchPostId: typeof r.matchPostId === "string" ? r.matchPostId : null,
    createdAt:  String(r.createdAt ?? ""),
    field:      fieldRaw ? normalizeField(fieldRaw) : undefined,
  };
}

export async function getMyMatches(): Promise<Match[]> {
  const raw = await apiFetch<unknown[]>("/api/matches/mine");
  return raw.map(normalizeMatch);
}
