"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyLobbies } from "@/lib/api/lobbies";
import type { Lobby } from "@/lib/types";

/**
 * Returns lobbies the current user has created or joined.
 * The joined IDs are used to disable the Join button on page load
 * (persisted via DB, survives refresh).
 */
export function useJoinedLobbies() {
  const [joinedLobbies, setJoinedLobbies] = useState<Lobby[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const lobbies = await getMyLobbies();
      setJoinedLobbies(lobbies);
      setJoinedIds(lobbies.map((l) => l.id));
    } catch {
      // silently fail — page still works with local state fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const markJoined = useCallback((lobbyId: string) => {
    setJoinedIds((prev) => (prev.includes(lobbyId) ? prev : [...prev, lobbyId]));
  }, []);

  return { joinedLobbies, joinedIds, loading, refresh, markJoined };
}
