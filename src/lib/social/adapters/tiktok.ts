import "server-only";
/**
 * TikTok Login Kit + Display API adapter (read-only; publishing uses the
 * manual workflow until the Content Posting API audit is passed).
 *   - Authorize: https://www.tiktok.com/v2/auth/authorize/
 *   - Token:     POST https://open.tiktokapis.com/v2/oauth/token/ (authorization_code / refresh_token)
 *   - Revoke:    POST https://open.tiktokapis.com/v2/oauth/revoke/
 *   - User:      GET  https://open.tiktokapis.com/v2/user/info/?fields=...
 * Scopes: user.info.basic, user.info.profile, user.info.stats, video.list.
 * VERIFY AGAINST CURRENT DOCS BEFORE PRODUCTION.
 */
import { expiresFromNow, socialFetch, ymd } from "../http";
import type { SocialAdapter, TokenSet } from "../types";

const clientKey = () => process.env.TIKTOK_CLIENT_KEY ?? "";
const clientSecret = () => process.env.TIKTOK_CLIENT_SECRET ?? "";
const SCOPES = ["user.info.basic", "user.info.profile", "user.info.stats", "video.list"];

interface TikTokToken {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
}
interface TikTokUser {
  open_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  follower_count?: number;
  likes_count?: number;
  video_count?: number;
}

const toTokens = (t: TikTokToken): TokenSet => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token,
  expiresAt: expiresFromNow(t.expires_in),
  refreshExpiresAt: expiresFromNow(t.refresh_expires_in),
  tokenType: "bearer",
  scopes: t.scope ? t.scope.split(",") : SCOPES,
});

async function getUser(accessToken: string) {
  const res = await socialFetch<{ data: { user: TikTokUser } }>(
    "tiktok",
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name,avatar_url,follower_count,likes_count,video_count",
    { bearer: accessToken },
  );
  return res.data.user;
}

export const tiktokAdapter: SocialAdapter = {
  platform: "tiktok",
  requiredEnv: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
  isConfigured: () => Boolean(clientKey() && clientSecret()),
  usesPkce: false,
  scopes: SCOPES,
  getAuthorizationUrl: ({ redirectUri, state }) =>
    `https://www.tiktok.com/v2/auth/authorize/?${new URLSearchParams({
      client_key: clientKey(),
      scope: SCOPES.join(","),
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    })}`,
  async exchangeCode(code, redirectUri) {
    const t = await socialFetch<TikTokToken>("tiktok", "https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      form: { client_key: clientKey(), client_secret: clientSecret(), code, grant_type: "authorization_code", redirect_uri: redirectUri },
    });
    const user = await getUser(t.access_token);
    return [
      {
        providerAccountId: user.open_id ?? t.open_id,
        username: user.username ?? null,
        displayName: user.display_name ?? user.username ?? null,
        avatarUrl: user.avatar_url ?? null,
        accountType: "creator",
        tokens: toTokens(t),
      },
    ];
  },
  async refreshTokens(tokens) {
    const t = await socialFetch<TikTokToken>("tiktok", "https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      form: { client_key: clientKey(), client_secret: clientSecret(), grant_type: "refresh_token", refresh_token: tokens.refreshToken ?? "" },
    });
    return toTokens(t);
  },
  async fetchFollowers(tokens) {
    const u = await getUser(tokens.accessToken);
    return typeof u.follower_count === "number" ? u.follower_count : null;
  },
  /** Display API exposes lifetime counters only; recorded as daily snapshots. */
  async fetchMetrics(tokens, _account, _since, until) {
    const u = await getUser(tokens.accessToken);
    const date = ymd(until);
    const out = [];
    if (typeof u.follower_count === "number") out.push({ date, key: "followers", platformName: "follower_count", value: u.follower_count });
    if (typeof u.likes_count === "number") out.push({ date, key: "likes_total", platformName: "likes_count", value: u.likes_count });
    if (typeof u.video_count === "number") out.push({ date, key: "video_count", platformName: "video_count", value: u.video_count });
    return out;
  },
  async revoke(tokens) {
    await socialFetch("tiktok", "https://open.tiktokapis.com/v2/oauth/revoke/", {
      method: "POST",
      form: { client_key: clientKey(), client_secret: clientSecret(), token: tokens.accessToken },
    });
  },
};
