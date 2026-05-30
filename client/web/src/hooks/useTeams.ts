"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyTeams } from "@/lib/api/teams";
import type { Team } from "@/lib/types";

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTeams(await getMyTeams());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { teams, setTeams, loading, error, refresh };
}
