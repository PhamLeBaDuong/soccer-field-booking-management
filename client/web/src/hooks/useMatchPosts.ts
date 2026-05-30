"use client";

import { useCallback, useEffect, useState } from "react";
import { listMatchPosts } from "@/lib/api/matchPosts";
import type { MatchRequest } from "@/lib/types";

export function useMatchPosts() {
  const [posts, setPosts] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await listMatchPosts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load match posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { posts, setPosts, loading, error, refresh };
}
