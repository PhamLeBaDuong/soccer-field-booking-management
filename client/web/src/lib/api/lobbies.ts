import { apiFetch, canFallBackToMock, shouldUseMockData, warnMockData } from "@/lib/api/client";
import { normalizeField } from "@/lib/api/normalizers";
import { mockLobbies } from "@/lib/mock/matchmaking";
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
    endTime:     String(raw.endTime ?? ""),
    teamSize:    Number(raw.teamSize ?? 0),
    initialSize: Number(raw.initialSize ?? 1),
    joinedCount: slots.length + Number(raw.initialSize ?? 1),
    creatorId:   String(raw.creatorId ?? ""),
    creatorName,
    status:      String(raw.status ?? "open") as LobbyStatus,
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
  if (shouldUseMockData()) {
    warnMockData("Lobbies");
    return mockLobbies;
  }

  const query = new URLSearchParams();
  if (params?.fieldId)  query.set("fieldId",  params.fieldId);
  if (params?.status)   query.set("status",   params.status);
  if (params?.teamSize) query.set("teamSize", String(params.teamSize));

  try {
    const raw = await apiFetch<Record<string, unknown>[]>(
      `/api/lobbies${query.toString() ? `?${query}` : ""}`,
    );
    return raw.map(normalizeLobby);
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Lobbies");
      return mockLobbies;
    }
    throw error;
  }
}

export async function getMyLobbies(): Promise<Lobby[]> {
  if (shouldUseMockData()) {
    warnMockData("My lobbies");
    return mockLobbies;
  }

  try {
    const raw = await apiFetch<Record<string, unknown>[]>("/api/lobbies/mine");
    return raw.map(normalizeLobby);
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("My lobbies");
      return mockLobbies;
    }
    throw error;
  }
}

export async function joinLobby(lobbyId: string): Promise<{ lobby: Lobby; match: unknown }> {
  if (shouldUseMockData()) {
    warnMockData("Join lobby");
    const lobby = mockLobbies.find((l) => l.id === lobbyId);
    if (!lobby) throw new Error("Lobby not found");
    return { lobby, match: null };
  }

  try {
    const result = await apiFetch<{ lobby: Record<string, unknown>; match: unknown }>(
      `/api/lobbies/${lobbyId}/join`,
      { method: "POST" },
    );
    return { lobby: normalizeLobby(result.lobby), match: result.match };
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Join lobby");
      const lobby = mockLobbies.find((l) => l.id === lobbyId);
      if (!lobby) throw error;
      return { lobby, match: null };
    }
    throw error;
  }
}

export async function createLobby(payload: {
  fieldId: string;
  startTime: string;
  endTime: string;
  teamSize: number;
  initialSize: number;
  visibility: MatchRequestVisibility;
}): Promise<{ lobby: Lobby; match: unknown }> {
  if (shouldUseMockData()) {
    warnMockData("Create lobby");
    const fakeLobby: Lobby = {
      id:          `lobby-${Date.now()}`,
      fieldId:     payload.fieldId,
      startTime:   payload.startTime,
      endTime:     payload.endTime,
      teamSize:    payload.teamSize,
      initialSize: payload.initialSize,
      joinedCount: payload.initialSize,
      creatorName: "You",
      status:      payload.initialSize >= payload.teamSize ? "full" : "open",
      visibility:  payload.visibility,
    };
    return { lobby: fakeLobby, match: null };
  }

  try {
    const result = await apiFetch<{ lobby: Record<string, unknown>; match: unknown }>(
      "/api/lobbies",
      { method: "POST", body: JSON.stringify(payload) },
    );
    return { lobby: normalizeLobby(result.lobby), match: result.match };
  } catch (error) {
    if (canFallBackToMock(error)) {
      warnMockData("Create lobby");
      const fakeLobby: Lobby = {
        id:          `lobby-${Date.now()}`,
        fieldId:     payload.fieldId,
        startTime:   payload.startTime,
        endTime:     payload.endTime,
        teamSize:    payload.teamSize,
        initialSize: payload.initialSize,
        joinedCount: payload.initialSize,
        creatorName: "You",
        status:      payload.initialSize >= payload.teamSize ? "full" : "open",
        visibility:  payload.visibility,
      };
      return { lobby: fakeLobby, match: null };
    }
    throw error;
  }
}
