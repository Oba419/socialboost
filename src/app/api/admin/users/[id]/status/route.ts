import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { clientIp } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/services/audit";

const schema = z.object({
  status: z.enum(["active", "suspended"]),
  reason: z.string().trim().min(5, "Give a reason of at least 5 characters.").max(500),
});

/** POST /api/admin/users/:id/status — suspend or reinstate a user (audited). */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiAdmin();
  const id = z.string().uuid().parse((await params).id);
  const input = await parseJson(req, schema);
  if (id === ctx.userId) throw new AppError("FORBIDDEN", "You can't change your own account status.");

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id, role, status").eq("id", id).maybeSingle();
  if (!target) throw new AppError("NOT_FOUND", "User not found.");
  if (target.role === "admin") throw new AppError("FORBIDDEN", "Administrators can't be suspended from the console.");

  const { error } = await admin.from("profiles").update({ status: input.status }).eq("id", id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not update the account.");

  // Block sign-in / token refresh at the auth layer too (ban), or lift it.
  const { error: banError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: input.status === "suspended" ? "876000h" : "none",
  });
  if (banError) logger.warn("Auth ban update failed", banError.message);

  await audit({
    userId: ctx.userId,
    action: input.status === "suspended" ? "admin.user_suspended" : "admin.user_reinstated",
    entityType: "user",
    entityId: id,
    metadata: { reason: input.reason, previous_status: target.status, auth_ban_applied: !banError },
    ip: clientIp(req.headers),
  });
  return { status: input.status };
});
