import { apiFetch } from "@/lib/api/client";
import { normalizeField } from "@/lib/api/normalizers";

import type { Field, Lobby, LobbyStatus, MatchRequestVisibility } from "@/lib/types";

// ─── Normalizer ───────────────────────────────────────────────────────────────

type RawSlot = { id: string; userId: string; user?: { id: string; name: string; username: string } };

function normalizeLobby(raw: Record<string, unknown>): Lobby {
  const field   = raw.field   ? normalizeField(raw.field as Record<string, unknown>) : undefined;
  const creator = raw.creator as Record<string, unknown> | undefined;
  const slots: RawSlot[] = Array.isArray(raw.slots) ? (raw.slots as RawSlot[]) : [];

  const creatorName = creator
    ? String(creator.name ?? creator.username ?? raw.creatorId ?? "Host")
    : String(raw.creatorId ?? "Host");

  return {
    id:          String(raw.id ?? ""),
    fieldId:     String(raw.fieldId ?? ""),
    field,
    startTime:   String(raw.startTime ?? ""),
    timeZone: field?.metadata.timeZone || "UTC",
    endTime:     String(raw.endTime ?? ""),
    teamSize:    Number(raw.teamSize ?? 0),
    initialSize: Number(raw.initialSize ?? 1),
    joinedCount: slots.length + Number(raw.initialSize ?? 1),
    creatorId:   String(raw.creatorId ?? ""),
    creatorName,
    // Legacy "matched" lobbies remain readable without creating new matches.
    status:      (raw.status === "matched" ? "confirmed" : String(raw.status ?? "open")) as LobbyStatus,
    visibility:  String(raw.visibility ?? "public") as MatchRequestVisibility,
    code:        raw.code ? String(raw.code) : undefined,
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function listLobbies(params?: {
  fieldId?: string;
  status?: string;
  teamSize?: number;
}): Promise<Lobby[]> {
  const query = new URLSearchParams();
  if (params?.fieldId)  query.set("fieldId",  params.fieldId);
  if (params?.status)   query.set("status",   params.status);
  if (params?.teamSize) query.set("teamSize", String(params.teamSize));

  const raw = await apiFetch<Record<string, unknown>[]>(
    `/api/lobbies${query.toString() ? `?${query}` : ""}`,
  );
  return raw.map(normalizeLobby);
}

export async function getMyLobbies(): Promise<Lobby[]> {
  const raw = await apiFetch<Record<string, unknown>[]>("/api/lobbies/mine");
  return raw.map(normalizeLobby);
}
export async function joinLobby(lobbyId: string): Promise<{ lobby: Lobby }> {
  const result = await apiFetch<{ lobby: Record<string, unknown> }>(
    "/api/lobbies/" + lobbyId + "/join", { method: "POST" });
  return { lobby: normalizeLobby(result.lobby) };
}

export async function cancelLobby(lobbyId: string): Promise<Lobby> {
  const result = await apiFetch<Record<string, unknown>>(
    `/api/lobbies/${encodeURIComponent(lobbyId)}`, { method: "DELETE" },
  );
  return normalizeLobby(result);
}
export async function createLobby(payload: {
  fieldId: string; startTime: string; endTime: string;
  teamSize: number; initialSize: number; visibility: MatchRequestVisibility;
}): Promise<{ lobby: Lobby }> {
  const result = await apiFetch<{ lobby: Record<string, unknown> }>("/api/lobbies", {
    method: "POST", body: JSON.stringify(payload),
  });
  return { lobby: normalizeLobby(result.lobby) };
}
