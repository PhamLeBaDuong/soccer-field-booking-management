"use client";

import { useCallback, useEffect, useState } from "react";
import { listLobbies } from "@/lib/api/lobbies";
import type { Lobby } from "@/lib/types";

export function useLobbies(params?: {
  fieldId?: string;
  status?: string;
  teamSize?: number;
}) {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fieldId  = params?.fieldId;
  const status   = params?.status;
  const teamSize = params?.teamSize;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLobbies(await listLobbies({ fieldId, status, teamSize }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lobbies");
    } finally {
      setLoading(false);
    }
  }, [fieldId, status, teamSize]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { lobbies, setLobbies, loading, error, refresh };
}
