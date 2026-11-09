import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import { audit } from "@/services/audit";

const bodySchema = z.object({ confirm: z.literal("DELETE", { message: 'Type "DELETE" to confirm.' }) });

/**
 * POST /api/account/delete — permanently deletes the user. Owned
 * workspaces and all their rows cascade; storage objects are removed first.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  await parseJson(req, bodySchema);
  await rateLimit("auth", `delete:${ctx.userId}`);
  const admin = createAdminClient();

  const { data: owned } = await admin.from("organizations").select("id").eq("owner_id", ctx.userId);
  const ownedIds = (owned ?? []).map((o) => o.id);
  if (ownedIds.length) {
    const { data: media } = await admin.from("media_assets").select("storage_path").in("organization_id", ownedIds);
    if (media?.length) {
      const { error } = await admin.storage.from("media").remove(media.map((m) => m.storage_path));
      if (error) logger.warn("Failed to remove some media during account deletion", error.message);
    }
  }

  // Audit before deletion (user_id is set null on cascade, the entry remains).
  await audit({
    userId: ctx.userId,
    action: "account.deleted",
    entityType: "user",
    entityId: ctx.userId,
    metadata: { ownedWorkspaces: ownedIds.length },
    ip: clientIp(req.headers),
  });

  const { error } = await admin.auth.admin.deleteUser(ctx.userId);
  if (error) {
    logger.error("Account deletion failed", error.message);
    throw new AppError("INTERNAL_ERROR", "We couldn't delete your account. Please contact support.");
  }

  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => undefined);
  return { deleted: true };
});
