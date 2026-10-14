import { apiFetch } from "@/lib/api/client";

import type { Team } from "@/lib/types";

// ─── Normalizer ───────────────────────────────────────────────────────────────

export function normalizeTeam(raw: Record<string, unknown>): Team {
  const members = Array.isArray(raw.members) ? raw.members : [];
  return {
    id:           String(raw.id ?? ""),
    name:         String(raw.name ?? ""),
    size:         Number(raw.size ?? 5),
    leaderId:     String(raw.leaderId ?? ""),
    membersCount: members.length,
    members: members.map((value: unknown) => {
      const member = value as Record<string, unknown>;
      const user = (member.user ?? {}) as Record<string, unknown>;
      return { userId: String(member.userId ?? user.id ?? ""),
        name: String(user.name ?? user.username ?? "Player"), username: String(user.username ?? "") };
    }),
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getMyTeams(): Promise<Team[]> {
  const raw = await apiFetch<Record<string, unknown>[]>("/api/teams/mine");
  return raw.map(normalizeTeam);
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
