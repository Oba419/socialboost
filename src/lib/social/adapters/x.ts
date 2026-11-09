import "server-only";
/**
 * X (Twitter) API v2 adapter, OAuth 2.0 Authorization Code with PKCE.
 *   - Authorize: https://x.com/i/oauth2/authorize
 *   - Token:     POST https://api.x.com/2/oauth2/token (Basic auth, confidential client)
 *   - Revoke:    POST https://api.x.com/2/oauth2/revoke
 *   - Me:        GET  https://api.x.com/2/users/me?user.fields=profile_image_url,public_metrics
 *   - Publish:   POST https://api.x.com/2/tweets
 * Scopes: tweet.read, tweet.write, users.read, offline.access.
 * Write access and rate limits depend on your paid X API tier.
 * VERIFY AGAINST CURRENT DOCS BEFORE PRODUCTION.
 */
import { basicAuth, expiresFromNow, socialFetch, ymd } from "../http";
import { SocialApiError, type SocialAdapter, type TokenSet } from "../types";

const clientId = () => process.env.X_CLIENT_ID ?? "";
const clientSecret = () => process.env.X_CLIENT_SECRET ?? "";
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

interface XToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}
interface XUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  public_metrics?: { followers_count: number };
}

const toTokens = (t: XToken): TokenSet => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token ?? null,
  expiresAt: expiresFromNow(t.expires_in),
  tokenType: t.token_type,
  scopes: t.scope.split(" "),
});

async function me(token: string) {
  return (await socialFetch<{ data: XUser }>("x", "https://api.x.com/2/users/me?user.fields=profile_image_url,public_metrics", { bearer: token })).data;
}

const tokenHeaders = () => ({ Authorization: basicAuth(clientId(), clientSecret()) });

export const xAdapter: SocialAdapter = {
  platform: "x",
  requiredEnv: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
  isConfigured: () => Boolean(clientId() && clientSecret()),
  usesPkce: true,
  scopes: SCOPES,
  getAuthorizationUrl: ({ redirectUri, state, codeChallenge }) =>
    `https://x.com/i/oauth2/authorize?${new URLSearchParams({
      response_type: "code",
      client_id: clientId(),
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      state,
      code_challenge: codeChallenge ?? "",
      code_challenge_method: "S256",
    })}`,
  async exchangeCode(code, redirectUri, codeVerifier) {
    if (!codeVerifier) throw new SocialApiError("Missing PKCE verifier.", "x", false);
    const t = await socialFetch<XToken>("x", "https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: tokenHeaders(),
      form: { grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: codeVerifier, client_id: clientId() },
    });
    const u = await me(t.access_token);
    return [
      {
        providerAccountId: u.id,
        username: u.username,
        displayName: u.name,
        avatarUrl: u.profile_image_url ?? null,
        accountType: "user",
        tokens: toTokens(t),
      },
    ];
  },
  async refreshTokens(tokens) {
    if (!tokens.refreshToken) throw new SocialApiError("X access expired. Reconnect your account.", "x", false, 401, true);
    const t = await socialFetch<XToken>("x", "https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: tokenHeaders(),
      form: { grant_type: "refresh_token", refresh_token: tokens.refreshToken, client_id: clientId() },
    });
    return toTokens(t);
  },
  async fetchFollowers(tokens) {
    const u = await me(tokens.accessToken);
    return u.public_metrics?.followers_count ?? null;
  },
  async fetchMetrics(tokens, _account, _since, until) {
    const u = await me(tokens.accessToken);
    return typeof u.public_metrics?.followers_count === "number"
      ? [{ date: ymd(until), key: "followers", platformName: "followers_count", value: u.public_metrics.followers_count }]
      : [];
  },
  async publish(tokens, account, input) {
    if (input.media.length) {
      throw new SocialApiError("X direct publishing here supports text posts. Publish media posts manually.", "x", false);
    }
    const res = await socialFetch<{ data: { id: string } }>("x", "https://api.x.com/2/tweets", {
      method: "POST",
      bearer: tokens.accessToken,
      json: { text: input.text },
    });
    const handle = account.username ?? "i";
    return { providerPostId: res.data.id, url: `https://x.com/${handle}/status/${res.data.id}` };
  },
  async revoke(tokens) {
    await socialFetch("x", "https://api.x.com/2/oauth2/revoke", {
      method: "POST",
      headers: tokenHeaders(),
      form: { token: tokens.refreshToken ?? tokens.accessToken, token_type_hint: tokens.refreshToken ? "refresh_token" : "access_token", client_id: clientId() },
    });
  },
};
