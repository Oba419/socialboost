import "server-only";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";
import type { PlatformId } from "@/config/platforms";
import type { SocialAccountRow } from "@/types/database";
import { getAdapter } from "./registry";
import { SocialApiError, type ProviderAccount, type TokenSet } from "./types";

/** Tokens are encrypted at rest and only ever handled with the service role. */

const REFRESH_SKEW_MS = 5 * 60_000;

export async function storeTokens(admin: AdminSupabaseClient, socialAccountId: string, tokens: TokenSet): Promise<void> {
  const { error } = await admin.from("social_account_tokens").upsert(
    {
      social_account_id: socialAccountId,
      access_token_enc: encryptSecret(tokens.accessToken),
      refresh_token_enc: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
      token_type: tokens.tokenType ?? null,
      expires_at: tokens.expiresAt ? tokens.expiresAt.toISOString() : null,
      refresh_expires_at: tokens.refreshExpiresAt ? tokens.refreshExpiresAt.toISOString() : null,
      extra_enc: tokens.extra ? encryptSecret(JSON.stringify(tokens.extra)) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "social_account_id" },
  );
  if (error) throw new Error(`Failed to store tokens: ${error.message}`);
}

export async function loadTokens(admin: AdminSupabaseClient, account: Pick<SocialAccountRow, "id" | "platform" | "scopes">): Promise<TokenSet> {
  const { data } = await admin.from("social_account_tokens").select("*").eq("social_account_id", account.id).maybeSingle();
  if (!data) throw new SocialApiError("No stored credentials. Reconnect this account.", account.platform as PlatformId, false, 401, true);
  return {
    accessToken: decryptSecret(data.access_token_enc),
    refreshToken: data.refresh_token_enc ? decryptSecret(data.refresh_token_enc) : null,
    tokenType: data.token_type,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    refreshExpiresAt: data.refresh_expires_at ? new Date(data.refresh_expires_at) : null,
    scopes: account.scopes,
    extra: data.extra_enc ? (JSON.parse(decryptSecret(data.extra_enc)) as Record<string, string>) : null,
  };
}

export function needsRefresh(tokens: TokenSet, now = Date.now()): boolean {
  return Boolean(tokens.expiresAt && tokens.expiresAt.getTime() - REFRESH_SKEW_MS <= now);
}

/** Loads tokens and refreshes them when they are about to expire. */
export async function getValidTokens(admin: AdminSupabaseClient, account: SocialAccountRow): Promise<TokenSet> {
  const platform = account.platform as PlatformId;
  const tokens = await loadTokens(admin, account);
  if (!needsRefresh(tokens)) return tokens;
  const adapter = getAdapter(platform);
  if (!adapter.refreshTokens) {
    throw new SocialApiError("Access to this account has expired. Reconnect it.", platform, false, 401, true);
  }
  const refreshed = await adapter.refreshTokens(tokens);
  await storeTokens(admin, account.id, refreshed);
  return refreshed;
}

export const toProviderAccount = (row: SocialAccountRow): ProviderAccount => ({
  providerAccountId: row.provider_account_id,
  username: row.username,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  accountType: row.account_type,
});
