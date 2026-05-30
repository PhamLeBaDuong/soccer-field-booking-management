import { apiFetch, canFallBackToMock, shouldUseMockData, warnMockData } from "@/lib/api/client";
import { mockTeams } from "@/lib/mock/matchmaking";
import type { Team } from "@/lib/types";

// ─── Normalizer ───────────────────────────────────────────────────────────────

export function normalizeTeam(raw: Record<string, unknown>): Team {
  const members = Array.isArray(raw.members) ? raw.members : [];
  return {
    id:           String(raw.id ?? ""),
    name:         String(raw.name ?? ""),
    size:         Number(raw.size ?? 5),
    rating:       Number(raw.rating ?? 0),
    leaderId:     String(raw.leaderId ?? ""),
    membersCount: members.length,
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getMyTeams(): Promise<Team[]> {
  if (shouldUseMockData()) {
    warnMockData("Teams");
    return mockTeams;
  }
  try {
    const raw = await apiFetch<Record<string, unknown>[]>("/api/teams/mine");
    return raw.map(normalizeTeam);
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Teams");
      return mockTeams;
    }
    throw error;
  }
}

export async function createTeam(payload: { name: string; size: number }): Promise<Team> {
  const raw = await apiFetch<Record<string, unknown>>("/api/teams", {
    method: "POST",
    body:   JSON.stringify(payload),
  });
  return normalizeTeam(raw);
}

export async function disbandTeam(teamId: string): Promise<void> {
  await apiFetch(`/api/teams/${teamId}`, { method: "DELETE" });
}

export async function addTeamMember(teamId: string, userId: string): Promise<Team> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/teams/${teamId}/members`, {
    method: "POST",
    body:   JSON.stringify({ userId }),
  });
  return normalizeTeam(raw);
}

export async function removeTeamMember(teamId: string, userId: string): Promise<Team> {
  const raw = await apiFetch<Record<string, unknown>>(
    `/api/teams/${teamId}/members/${userId}`,
    { method: "DELETE" },
  );
  return normalizeTeam(raw);
}

export async function createMatchPost(payload: {
  teamId: string;
  fieldId: string;
  preferredStartTime: string;
  preferredEndTime: string;
  visibility: "public" | "private";
  note?: string;
}): Promise<Record<string, unknown>> {
  return apiFetch("/api/match-posts", {
    method: "POST",
    body:   JSON.stringify(payload),
  });
}
