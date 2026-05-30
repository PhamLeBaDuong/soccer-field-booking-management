import { apiFetch, canFallBackToMock, shouldUseMockData, warnMockData } from "@/lib/api/client";
import { normalizeField } from "@/lib/api/normalizers";
import { mockMatchRequests } from "@/lib/mock/matchmaking";
import type { MatchRequest, MatchRequestVisibility } from "@/lib/types";

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeMatchPost(raw: Record<string, unknown>): MatchRequest {
  const fieldRaw = raw.field as Record<string, unknown> | undefined;
  const teamRaw  = raw.team  as Record<string, unknown> | undefined;

  return {
    id:                 String(raw.id ?? ""),
    teamId:             String(raw.teamId ?? ""),
    teamName:           teamRaw ? String(teamRaw.name ?? "") : "",
    teamSize:           teamRaw ? Number(teamRaw.size ?? 5)  : 5,
    fieldId:            String(raw.fieldId ?? ""),
    field:              fieldRaw ? normalizeField(fieldRaw) : undefined,
    preferredStartTime: String(raw.preferredStartTime ?? ""),
    preferredEndTime:   String(raw.preferredEndTime   ?? ""),
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
  if (shouldUseMockData()) {
    warnMockData("Match posts");
    return mockMatchRequests;
  }

  const query = new URLSearchParams();
  if (params?.teamSize) query.set("teamSize", String(params.teamSize));
  if (params?.fieldId)  query.set("fieldId",  params.fieldId);
  if (params?.status)   query.set("status",   params.status);

  try {
    const raw = await apiFetch<Record<string, unknown>[]>(
      `/api/match-posts${query.toString() ? `?${query}` : ""}`,
    );
    return raw.map(normalizeMatchPost);
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Match posts");
      return mockMatchRequests;
    }
    throw error;
  }
}

export async function getMyMatchPosts(): Promise<MatchRequest[]> {
  if (shouldUseMockData()) {
    warnMockData("My match posts");
    return mockMatchRequests;
  }

  try {
    const raw = await apiFetch<Record<string, unknown>[]>("/api/match-posts/mine");
    return raw.map(normalizeMatchPost);
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("My match posts");
      return mockMatchRequests;
    }
    throw error;
  }
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
): Promise<unknown> {
  if (shouldUseMockData()) {
    warnMockData("Accept match post");
    return { message: "Mock accepted" };
  }

  try {
    return await apiFetch(`/api/match-posts/${postId}/accept`, {
      method: "POST",
      body:   JSON.stringify(payload),
    });
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Accept match post");
      return { message: "Mock accepted (fallback)" };
    }
    throw error;
  }
}
