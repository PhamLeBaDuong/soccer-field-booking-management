"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyMatches } from "@/lib/api/matches";
import type { Match } from "@/lib/types";

export function useMatches(): {
  matches: Match[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMatches(await getMyMatches());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load matches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { matches, loading, error, refresh };
}
