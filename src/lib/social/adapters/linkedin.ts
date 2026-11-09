import "server-only";
/**
 * LinkedIn adapter (member posting).
 *   - Authorize: https://www.linkedin.com/oauth/v2/authorization
 *   - Token:     POST https://www.linkedin.com/oauth/v2/accessToken (refresh only for approved partners)
 *   - Revoke:    POST https://www.linkedin.com/oauth/v2/revoke
 *   - Profile:   GET  https://api.linkedin.com/v2/userinfo (OpenID Connect)
 *   - Publish:   POST https://api.linkedin.com/rest/posts (LinkedIn-Version header, LINKEDIN_API_VERSION)
 * Scopes: openid, profile, w_member_social. Member follower counts and
 * analytics require the Community Management API (not requested here).
 * VERIFY AGAINST CURRENT DOCS BEFORE PRODUCTION.
 */
import { expiresFromNow, socialFetch, socialRequest } from "../http";
import { SocialApiError, type SocialAdapter, type TokenSet } from "../types";

const clientId = () => process.env.LINKEDIN_CLIENT_ID ?? "";
const clientSecret = () => process.env.LINKEDIN_CLIENT_SECRET ?? "";
const apiVersion = () => process.env.LINKEDIN_API_VERSION || "202510";
const SCOPES = ["openid", "profile", "w_member_social"];

interface LinkedInToken {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

const toTokens = (t: LinkedInToken): TokenSet => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token ?? null,
  expiresAt: expiresFromNow(t.expires_in),
  refreshExpiresAt: expiresFromNow(t.refresh_token_expires_in),
  tokenType: "bearer",
  scopes: t.scope ? t.scope.split(/[ ,]/).filter(Boolean) : SCOPES,
});

export const linkedinAdapter: SocialAdapter = {
  platform: "linkedin",
  requiredEnv: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  isConfigured: () => Boolean(clientId() && clientSecret()),
  usesPkce: false,
  scopes: SCOPES,
  getAuthorizationUrl: ({ redirectUri, state }) =>
    `https://www.linkedin.com/oauth/v2/authorization?${new URLSearchParams({
      response_type: "code",
      client_id: clientId(),
      redirect_uri: redirectUri,
      state,
      scope: SCOPES.join(" "),
    })}`,
  async exchangeCode(code, redirectUri) {
    const t = await socialFetch<LinkedInToken>("linkedin", "https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      form: { grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId(), client_secret: clientSecret() },
    });
    const me = await socialFetch<{ sub: string; name?: string; picture?: string }>("linkedin", "https://api.linkedin.com/v2/userinfo", {
      bearer: t.access_token,
    });
    return [
      {
        providerAccountId: me.sub,
        username: null,
        displayName: me.name ?? null,
        avatarUrl: me.picture ?? null,
        accountType: "member",
        tokens: toTokens(t),
      },
    ];
  },
  async refreshTokens(tokens) {
    if (!tokens.refreshToken) throw new SocialApiError("LinkedIn access expired. Reconnect your account.", "linkedin", false, 401, true);
    const t = await socialFetch<LinkedInToken>("linkedin", "https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      form: { grant_type: "refresh_token", refresh_token: tokens.refreshToken, client_id: clientId(), client_secret: clientSecret() },
    });
    return toTokens(t);
  },
  async publish(tokens, account, input) {
    if (input.media.length) {
      throw new SocialApiError("LinkedIn direct publishing here supports text posts. Publish media posts manually.", "linkedin", false);
    }
    const author = `urn:li:person:${account.providerAccountId}`;
    const res = await socialRequest<unknown>("linkedin", "https://api.linkedin.com/rest/posts", {
      method: "POST",
      bearer: tokens.accessToken,
      headers: { "LinkedIn-Version": apiVersion(), "X-Restli-Protocol-Version": "2.0.0" },
      json: {
        author,
        commentary: input.text,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      },
    });
    const urn = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id");
    if (!urn) throw new SocialApiError("LinkedIn did not confirm the post ID.", "linkedin", false);
    return { providerPostId: urn, url: `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/` };
  },
  async revoke(tokens) {
    await socialFetch("linkedin", "https://www.linkedin.com/oauth/v2/revoke", {
      method: "POST",
      form: { client_id: clientId(), client_secret: clientSecret(), token: tokens.accessToken },
    });
  },
};
