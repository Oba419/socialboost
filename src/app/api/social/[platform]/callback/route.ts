import { NextResponse, type NextRequest } from "next/server";
import { isPlatformId, PLATFORMS } from "@/config/platforms";
import { requireApiUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/entitlements";
import { isAppError } from "@/lib/errors";
import { ConfigurationError, publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { clientIp } from "@/lib/security/rate-limit";
import { callbackUrl, consumeOAuthState } from "@/lib/social/oauth-state";
import { getAdapter } from "@/lib/social/registry";
import { storeTokens } from "@/lib/social/tokens";
import { replaceMetrics } from "@/lib/social/metrics-store";
import { ymd } from "@/lib/social/http";
import { SocialApiError } from "@/lib/social/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/services/audit";
import { notify } from "@/services/notifications";

type Ctx = { params: Promise<{ platform: string }> };

function redirectTo(params: Record<string, string>) {
  const url = new URL("/dashboard/accounts", publicEnv.NEXT_PUBLIC_APP_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

/** GET /api/social/:platform/callback — completes OAuth, stores encrypted tokens. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { platform } = await params;
  if (!isPlatformId(platform)) return redirectTo({ error: "unknown_platform" });
  const sp = req.nextUrl.searchParams;

  try {
    const state = await consumeOAuthState(platform, sp.get("state"));
    if (!state) return redirectTo({ error: "invalid_state" });
    if (sp.get("error")) return redirectTo({ error: "access_denied" });
    const code = sp.get("code");
    if (!code) return redirectTo({ error: "missing_code" });

    const ctx = await requireApiUser();
    // The flow must be completed by the same user, in the same workspace.
    if (ctx.userId !== state.userId || ctx.organization.id !== state.orgId) return redirectTo({ error: "invalid_state" });
    if (ctx.role === "viewer") return redirectTo({ error: "forbidden" });

    const adapter = getAdapter(platform);
    const accounts = await adapter.exchangeCode(code, callbackUrl(platform), state.codeVerifier ?? undefined);

    const admin = createAdminClient();
    const ent = await getEntitlements(ctx.billingUserId);
    const { data: existing } = await admin
      .from("social_accounts")
      .select("id, platform, provider_account_id")
      .eq("organization_id", ctx.organization.id);
    let total = existing?.length ?? 0;
    let connected = 0;
    let skipped = 0;

    for (const acct of accounts) {
      const isNew = !existing?.some((e) => e.platform === platform && e.provider_account_id === acct.providerAccountId);
      if (isNew && total >= ent.plan.limits.socialAccounts) {
        skipped++;
        continue;
      }
      const { data: row, error } = await admin
        .from("social_accounts")
        .upsert(
          {
            organization_id: ctx.organization.id,
            platform,
            provider_account_id: acct.providerAccountId,
            username: acct.username,
            display_name: acct.displayName,
            avatar_url: acct.avatarUrl,
            account_type: acct.accountType,
            status: "connected",
            scopes: acct.tokens.scopes,
            last_error: null,
            connected_by: ctx.userId,
          },
          { onConflict: "organization_id,platform,provider_account_id" },
        )
        .select("*")
        .single();
      if (error || !row) throw new Error(`Failed to save account: ${error?.message}`);
      await storeTokens(admin, row.id, acct.tokens);
      if (isNew) total++;
      connected++;

      // Initial follower snapshot (best effort).
      if (adapter.fetchFollowers) {
        try {
          const followers = await adapter.fetchFollowers(acct.tokens, acct);
          if (followers !== null) {
            await replaceMetrics(admin, {
              organizationId: ctx.organization.id,
              platform,
              socialAccountId: row.id,
              source: "api",
              values: [{ date: ymd(new Date()), key: "followers", platformName: "followers", value: followers }],
            });
          }
          await admin.from("social_accounts").update({ last_synced_at: new Date().toISOString() }).eq("id", row.id);
        } catch (e) {
          logger.warn(`Initial ${platform} follower fetch failed`, e instanceof Error ? e.message : e);
        }
      }

      await audit({
        userId: ctx.userId,
        organizationId: ctx.organization.id,
        action: "social.connected",
        entityType: "social_account",
        entityId: row.id,
        metadata: { platform, scopes: acct.tokens.scopes },
        ip: clientIp(req.headers),
      });
    }

    if (connected) {
      await notify({
        userId: ctx.userId,
        organizationId: ctx.organization.id,
        category: "integrations",
        title: `${PLATFORMS[platform].name} connected`,
        body: `${connected} account${connected > 1 ? "s" : ""} connected.${skipped ? ` ${skipped} skipped (plan limit).` : ""}`,
        link: "/dashboard/accounts",
      });
    }
    if (!connected && skipped) return redirectTo({ error: "limit_reached" });
    return redirectTo({ connected: platform, ...(skipped ? { skipped: String(skipped) } : {}) });
  } catch (error) {
    if (error instanceof ConfigurationError) return redirectTo({ error: "not_configured" });
    if (isAppError(error) && error.code === "UNAUTHENTICATED") {
      return NextResponse.redirect(new URL("/login?next=/dashboard/accounts", publicEnv.NEXT_PUBLIC_APP_URL));
    }
    if (error instanceof SocialApiError && !error.retryable && !error.authExpired && error.status === undefined) {
      // Adapter-level business errors (e.g. no Instagram professional account) — safe, user-facing.
      return redirectTo({ error: "no_eligible_account", platform });
    }
    logger.error(`OAuth callback failed for ${platform}`, error);
    return redirectTo({ error: "connect_failed" });
  }
}
