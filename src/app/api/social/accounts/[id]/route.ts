import { z } from "zod";
import type { PlatformId } from "@/config/platforms";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { getAdapter } from "@/lib/social/registry";
import { syncAccount } from "@/lib/social/sync";
import { loadTokens } from "@/lib/social/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/services/audit";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

async function loadOwnedAccount(id: string, organizationId: string) {
  // RLS-scoped read proves the caller can see this account.
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!data) throw new AppError("NOT_FOUND", "Account not found.");
  return data;
}

/** POST /api/social/accounts/:id { action: "sync" } — fetch latest metrics now. */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const { action } = await parseJson(req, z.object({ action: z.literal("sync") }));
  void action;
  await rateLimit("write", `sync:${ctx.userId}`);
  const account = await loadOwnedAccount(id, ctx.organization.id);
  const result = await syncAccount(createAdminClient(), account, 7);
  if (!result.ok) {
    throw new AppError(result.expired ? "FORBIDDEN" : "PROVIDER_ERROR", result.error ?? "Sync failed.", { expired: result.expired ?? false });
  }
  return result;
});

/** DELETE /api/social/accounts/:id — disconnect, revoke and delete credentials. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const account = await loadOwnedAccount(id, ctx.organization.id);
  const admin = createAdminClient();

  let revoked = false;
  const adapter = getAdapter(account.platform as PlatformId);
  if (adapter.revoke) {
    try {
      const tokens = await loadTokens(admin, account);
      await adapter.revoke(tokens);
      revoked = true;
    } catch (e) {
      // Still delete our copy of the credentials even if the platform call fails.
      logger.warn(`Revoke failed for ${account.platform}`, e instanceof Error ? e.message : e);
    }
  }

  await admin.from("social_account_tokens").delete().eq("social_account_id", id);
  const { error } = await admin.from("social_accounts").delete().eq("id", id).eq("organization_id", ctx.organization.id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not disconnect the account.");

  await audit({
    userId: ctx.userId,
    organizationId: ctx.organization.id,
    action: "social.disconnected",
    entityType: "social_account",
    entityId: id,
    metadata: { platform: account.platform, revoked },
    ip: clientIp(req.headers),
  });
  return { disconnected: true, revoked };
});
