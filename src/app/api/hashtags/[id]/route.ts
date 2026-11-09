import { z } from "zod";
import { assertSameOrigin, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = z.string().uuid().parse((await params).id);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("saved_hashtags")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the hashtag.");
  if (!count) throw new AppError("NOT_FOUND", "Hashtag not found.");
  return { deleted: true };
});
