"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ApiFailure, ApiResult } from "@/lib/api/response";

/** Typed fetch for our JSON API envelope. Never throws on HTTP errors. */
export async function apiFetch<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<ApiResult<T>> {
  try {
    const { json, ...rest } = init ?? {};
    const res = await fetch(url, {
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    const body = (await res.json().catch(() => null)) as ApiResult<T> | null;
    if (body && typeof body === "object" && "ok" in body) return body;
    return { ok: false, error: { code: "INTERNAL_ERROR", message: `Unexpected response (${res.status}).` } };
  } catch {
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "Network error. Check your connection and try again." } };
  }
}

export function toastError(error: ApiFailure["error"]) {
  if (error.code === "PLAN_REQUIRED" || error.code === "QUOTA_EXCEEDED") {
    toast.error(error.message, {
      // Toast actions render outside the React tree, so a router instance isn't available here.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      action: { label: "Upgrade", onClick: () => (window.location.href = "/dashboard/billing") },
    });
  } else {
    toast.error(error.message);
  }
}

export interface AIResult<T> {
  output: T;
  generationId: string | null;
  creditsUsed: number;
  creditsRemaining: number;
  model: string;
}

/** Manages an AI generation request: loading, error, result and regenerate. */
export function useAIGeneration<TInput, TOutput>(service: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiFailure["error"] | null>(null);
  const [result, setResult] = useState<AIResult<TOutput> | null>(null);
  const [lastInput, setLastInput] = useState<TInput | null>(null);

  const generate = useCallback(
    async (input: TInput, opts?: { save?: boolean }) => {
      setLoading(true);
      setError(null);
      setLastInput(input);
      const res = await apiFetch<AIResult<TOutput>>(`/api/ai/${service}`, {
        method: "POST",
        json: { input, save: opts?.save },
      });
      setLoading(false);
      if (res.ok) {
        setResult(res.data);
        return res.data;
      }
      setError(res.error);
      toastError(res.error);
      return null;
    },
    [service],
  );

  const regenerate = useCallback(() => (lastInput ? generate(lastInput) : Promise.resolve(null)), [generate, lastInput]);

  return { generate, regenerate, loading, error, result, setResult, reset: () => setResult(null) };
}
