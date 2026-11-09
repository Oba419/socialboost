"use client";

import { toast } from "sonner";
import { useApiQuery } from "./use-api-query";
import { apiFetch, toastError } from "@/hooks/use-api";
import { createClient } from "@/lib/supabase/client";
import type { Paginated } from "@/lib/api/response";
import { MAX_MEDIA_BYTES, isAllowedMime, type MediaItem } from "./media-config";

export interface MediaListResponse extends Paginated<MediaItem> {
  storage: { usedBytes: number; limitBytes: number };
}

export function useMediaList(params: { kind?: string; page?: number; pageSize?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.kind) qs.set("kind", params.kind);
  qs.set("page", String(params.page ?? 1));
  qs.set("pageSize", String(params.pageSize ?? 30));
  return useApiQuery<MediaListResponse>(`/api/media?${qs}`);
}

/** Upload via signed upload URL: API validates + reserves path, browser uploads, API records. */
export async function uploadMediaFile(file: File, category?: string | null): Promise<MediaItem | null> {
  if (!isAllowedMime(file.type)) {
    toast.error(`${file.name}: unsupported file type.`);
    return null;
  }
  if (file.size > MAX_MEDIA_BYTES) {
    toast.error(`${file.name}: files must be 100 MB or smaller.`);
    return null;
  }
  const prep = await apiFetch<{ path: string; token: string }>("/api/media", {
    method: "POST",
    json: { fileName: file.name, mimeType: file.type, size: file.size },
  });
  if (!prep.ok) {
    toastError(prep.error);
    return null;
  }
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("media")
    .uploadToSignedUrl(prep.data.path, prep.data.token, file, { contentType: file.type });
  if (error) {
    toast.error(`${file.name}: upload failed. Please try again.`);
    return null;
  }
  const done = await apiFetch<MediaItem>("/api/media/complete", {
    method: "POST",
    json: { path: prep.data.path, fileName: file.name, category: category || null },
  });
  if (!done.ok) {
    toastError(done.error);
    return null;
  }
  return done.data;
}
