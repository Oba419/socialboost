import { z } from "zod";
import { assertSameOrigin, parseJson, parseQuery, route } from "@/lib/api/handler";
import { paginate } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

const listQuery = z.object({
  unread: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** GET /api/notifications — paginated list for the current user. */
export const GET = route(async (req) => {
  const ctx = await requireApiUser();
  const q = parseQuery(req, listQuery);
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .range((q.page - 1) * q.pageSize, q.page * q.pageSize - 1);
  if (q.unread === "true") query = query.is("read_at", null);
  const { data, count, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load notifications.");
  return paginate(data ?? [], q.page, q.pageSize, count ?? 0);
});

/** PATCH /api/notifications — mark all as read. */
export const PATCH = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  await parseJson(req, z.object({ action: z.literal("mark_all_read") }));
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", ctx.userId)
    .is("read_at", null);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not update notifications.");
  return { updated: true };
});
