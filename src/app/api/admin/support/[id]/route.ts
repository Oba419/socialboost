import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/services/audit";

const schema = z.object({ status: z.enum(["open", "in_progress", "resolved"]) });

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiAdmin();
  const id = z.string().uuid().parse((await params).id);
  const input = await parseJson(req, schema);
  const { data, error } = await createAdminClient()
    .from("contact_messages")
    .update({ status: input.status })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not update the request.");
  if (!data) throw new AppError("NOT_FOUND", "Request not found.");
  await audit({ userId: ctx.userId, action: "admin.support_status", entityType: "contact_message", entityId: id, metadata: { status: input.status } });
  return { status: input.status };
});
