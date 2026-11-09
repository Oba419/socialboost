import { randomUUID } from "node:crypto";
import { z } from "zod";
import { assertSameOrigin, parseJson, parseQuery, route } from "@/lib/api/handler";
import { paginate } from "@/lib/api/response";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { getContextEntitlements } from "@/lib/entitlements";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { MAX_MEDIA_BYTES, MEDIA_MIME_TYPES, isAllowedMime, type MediaItem } from "@/features/content-library/media-config";

const listQuery = z.object({
  kind: z.enum(["image", "video"]).optional(),
  category: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

/** GET /api/media — workspace media with short-lived signed preview URLs. */
export const GET = route(async (req) => {
  const ctx = await requireApiUser();
  const q = parseQuery(req, listQuery);
  const supabase = await createClient();

  let query = supabase
    .from("media_assets")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .range((q.page - 1) * q.pageSize, q.page * q.pageSize - 1);
  if (q.kind) query = query.eq("kind", q.kind);
  if (q.category) query = query.eq("category", q.category);

  const { data, count, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load media.");

  const rows = data ?? [];
  let urls = new Map<string, string>();
  if (rows.length) {
    const { data: signed } = await supabase.storage
      .from("media")
      .createSignedUrls(rows.map((r) => r.storage_path), 3600);
    urls = new Map(
      (signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as [string, string]] : [])),
    );
  }

  const { data: usage } = await supabase.from("media_assets").select("size_bytes").eq("organization_id", ctx.organization.id);
  const usedBytes = (usage ?? []).reduce((s, r) => s + Number(r.size_bytes), 0);
  const ent = await getContextEntitlements(ctx);

  const items: MediaItem[] = rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }));
  return {
    ...paginate(items, q.page, q.pageSize, count ?? 0),
    storage: { usedBytes, limitBytes: ent.plan.limits.mediaStorageMb * 1024 * 1024 },
  };
});

const uploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().refine(isAllowedMime, "This file type isn't supported. Use JPG, PNG, WebP, GIF, MP4, MOV or WebM."),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_MEDIA_BYTES, "Files must be 100 MB or smaller."),
});

/**
 * POST /api/media — request a signed upload URL. The browser then uploads the
 * file straight to Supabase Storage and calls POST /api/media/complete.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  await rateLimit("write", ctx.userId);
  const input = await parseJson(req, uploadRequestSchema);
  const supabase = await createClient();

  const ent = await getContextEntitlements(ctx);
  const { data: usage } = await supabase.from("media_assets").select("size_bytes").eq("organization_id", ctx.organization.id);
  const usedBytes = (usage ?? []).reduce((s, r) => s + Number(r.size_bytes), 0);
  const limitBytes = ent.plan.limits.mediaStorageMb * 1024 * 1024;
  if (usedBytes + input.size > limitBytes) {
    throw new AppError(
      "QUOTA_EXCEEDED",
      `This upload would exceed your ${ent.plan.name} plan's ${ent.plan.limits.mediaStorageMb} MB media storage. Delete some files or upgrade.`,
    );
  }

  const ext = MEDIA_MIME_TYPES[input.mimeType as keyof typeof MEDIA_MIME_TYPES];
  const path = `${ctx.organization.id}/${randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from("media").createSignedUploadUrl(path);
  if (error || !data) throw new AppError("INTERNAL_ERROR", "Could not prepare the upload. Check that the media bucket exists.");

  return { path: data.path, token: data.token, signedUrl: data.signedUrl };
});
