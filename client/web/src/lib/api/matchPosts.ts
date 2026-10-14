import { apiFetch } from "@/lib/api/client";
import { normalizeField } from "@/lib/api/normalizers";

import { normalizeMatch } from "./matches";
import type { Match, MatchRequest, MatchRequestVisibility } from "@/lib/types";

// ─── Normalizer ───────────────────────────────────────────────────────────────

export function normalizeMatchPost(raw: Record<string, unknown>): MatchRequest {
  const fieldRaw = raw.field as Record<string, unknown> | undefined;
  const teamRaw  = raw.team  as Record<string, unknown> | undefined;
  const field = fieldRaw ? normalizeField(fieldRaw) : undefined;

  return {
    id:                 String(raw.id ?? ""),
    teamId:             String(raw.teamId ?? ""),
    teamName:           teamRaw ? String(teamRaw.name ?? "") : "",
    teamSize:           teamRaw ? Number(teamRaw.size ?? 5)  : 5,
    fieldId:            String(raw.fieldId ?? ""),
    field:              field,
    preferredStartTime: String(raw.preferredStartTime ?? ""),
    preferredEndTime:   String(raw.preferredEndTime   ?? ""),
    timeZone: field?.metadata.timeZone || "UTC",
    visibility:         String(raw.visibility ?? "public") as MatchRequestVisibility,
    status:             String(raw.status ?? "open") as MatchRequest["status"],
    code:               raw.code ? String(raw.code) : undefined,
    note:               raw.note ? String(raw.note) : undefined,
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function listMatchPosts(params?: {
  teamSize?: number;
  fieldId?: string;
  status?: string;
}): Promise<MatchRequest[]> {
  const query = new URLSearchParams();
  if (params?.teamSize) query.set("teamSize", String(params.teamSize));
  if (params?.fieldId)  query.set("fieldId",  params.fieldId);
  if (params?.status)   query.set("status",   params.status);

  const raw = await apiFetch<Record<string, unknown>[]>(
    `/api/match-posts${query.toString() ? `?${query}` : ""}`,
  );
  return raw.map(normalizeMatchPost);
}

export async function getMyMatchPosts(): Promise<MatchRequest[]> {
  const raw = await apiFetch<Record<string, unknown>[]>("/api/match-posts/mine");
  return raw.map(normalizeMatchPost);
}

export async function acceptMatchPost(
  postId: string,
  payload: {
    acceptingTeamId: string;
    fieldId?: string;
    startTime?: string;
    endTime?: string;
    code?: string;
  },
): Promise<Match> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/match-posts/${encodeURIComponent(postId)}/accept`, {
      method: "POST",
      body:   JSON.stringify(payload),
    });
    if (raw.status !== "confirmed" || raw.matchPostId !== postId || typeof raw.id !== "string" || !raw.id) {
      throw new Error("The server did not confirm this match request.");
    }
    return normalizeMatch(raw);
}

export async function cancelMatchPost(postId: string): Promise<MatchRequest> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/match-posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
  return normalizeMatchPost(raw);
}
