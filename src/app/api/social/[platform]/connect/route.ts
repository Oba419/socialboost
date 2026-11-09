import { NextResponse, type NextRequest } from "next/server";
import { isPlatformId } from "@/config/platforms";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { assertLimit } from "@/lib/entitlements";
import { isAppError } from "@/lib/errors";
import { ConfigurationError, isServiceRoleConfigured, publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/security/rate-limit";
import { beginOAuth, callbackUrl } from "@/lib/social/oauth-state";
import { getAdapter } from "@/lib/social/registry";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ platform: string }> };

function back(error: string) {
  const url = new URL("/dashboard/accounts", publicEnv.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

/** GET /api/social/:platform/connect — starts the official OAuth flow. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { platform } = await params;
  if (!isPlatformId(platform)) return back("unknown_platform");

  try {
    const ctx = await requireApiUser();
    assertCanEdit(ctx);
    await rateLimit("oauth", ctx.userId);

    const adapter = getAdapter(platform);
    if (!adapter.isConfigured() || !isServiceRoleConfigured()) return back("not_configured");

    const supabase = await createClient();
    const { count } = await supabase
      .from("social_accounts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organization.id);
    await assertLimit(ctx, "socialAccounts", count ?? 0);

    const { state, codeChallenge } = await beginOAuth({
      platform,
      orgId: ctx.organization.id,
      userId: ctx.userId,
      usesPkce: adapter.usesPkce,
    });
    return NextResponse.redirect(adapter.getAuthorizationUrl({ redirectUri: callbackUrl(platform), state, codeChallenge }));
  } catch (error) {
    if (error instanceof ConfigurationError) return back("not_configured");
    if (isAppError(error)) {
      if (error.code === "UNAUTHENTICATED") return NextResponse.redirect(new URL("/login?next=/dashboard/accounts", publicEnv.NEXT_PUBLIC_APP_URL));
      return back(error.code === "QUOTA_EXCEEDED" ? "limit_reached" : error.code === "RATE_LIMITED" ? "rate_limited" : "forbidden");
    }
    logger.error("OAuth connect failed", error);
    return back("connect_failed");
  }
}
