import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

/** PATCH /api/notifications/:id — mark read/unread. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  const id = idSchema.parse((await params).id);
  const { read } = await parseJson(req, z.object({ read: z.boolean() }));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select("*")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not update the notification.");
  if (!data) throw new AppError("NOT_FOUND", "Notification not found.");
  return data;
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  const id = idSchema.parse((await params).id);
  const supabase = await createClient();
  const { error, count } = await supabase.from("notifications").delete({ count: "exact" }).eq("id", id).eq("user_id", ctx.userId);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the notification.");
  if (!count) throw new AppError("NOT_FOUND", "Notification not found.");
  return { deleted: true };
});
