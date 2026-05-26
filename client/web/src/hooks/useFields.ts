"use client";

import { useCallback, useEffect, useState } from "react";
import { getFieldById, getFields } from "@/lib/api/fields";
import type { Field } from "@/lib/types";

type FieldsState = {
  fields: Field[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useFields(): FieldsState {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFields(await getFields());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load fields.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { fields, loading, error, refresh };
}

export function useField(fieldId: string | null): {
  field: Field | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!fieldId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setField(await getFieldById(fieldId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load field.");
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { field, loading, error, refresh };
}

