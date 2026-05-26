"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminComplexes, getAdminFields } from "@/lib/api/admin";
import type { Complex, Field } from "@/lib/types";

export function useAdminData(): {
  complexes: Complex[];
  fields: Field[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextComplexes, nextFields] = await Promise.all([
        getAdminComplexes(),
        getAdminFields(),
      ]);
      setComplexes(nextComplexes);
      setFields(nextFields);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load admin data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { complexes, fields, loading, error, refresh };
}

