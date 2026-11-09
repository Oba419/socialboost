"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/hooks/use-api";

/**
 * Minimal GET query hook: fetches `url` whenever it changes (or `reload()` is
 * called). State is only set from the async response; `loading` is derived,
 * and the previous data is kept while a new request is in flight.
 */
export function useApiQuery<T>(url: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null } | null>(null);
  const key = `${url ?? ""}#${version}`;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    void apiFetch<T>(url).then((res) => {
      if (cancelled) return;
      setState((prev) => ({
        key,
        data: res.ok ? res.data : (prev?.data ?? null),
        error: res.ok ? null : res.error.message,
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [url, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    data: state?.data ?? null,
    error: state?.key === key ? state.error : null,
    loading: Boolean(url) && state?.key !== key,
    reload,
  };
}
