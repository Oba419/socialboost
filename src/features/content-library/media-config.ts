/** Media upload rules shared by the client uploader and the API. Mirrors the `media` bucket config. */
export const MEDIA_MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
} as const;

export type MediaMimeType = keyof typeof MEDIA_MIME_TYPES;

export const MAX_MEDIA_BYTES = 100 * 1024 * 1024; // 100 MB (bucket hard ceiling)

export const MEDIA_ACCEPT = Object.keys(MEDIA_MIME_TYPES).join(",");

export function isAllowedMime(mime: string): mime is MediaMimeType {
  return mime in MEDIA_MIME_TYPES;
}

export function mediaKind(mime: string): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export interface MediaItem {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: "image" | "video";
  category: string | null;
  created_at: string;
  url: string | null;
}
