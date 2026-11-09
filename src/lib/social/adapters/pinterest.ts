import "server-only";
/**
 * Pinterest API v5 adapter.
 *   - Authorize: https://www.pinterest.com/oauth/
 *   - Token:     POST https://api.pinterest.com/v5/oauth/token (Basic auth; authorization_code / refresh_token)
 *   - Account:   GET  https://api.pinterest.com/v5/user_account
 *   - Analytics: GET  https://api.pinterest.com/v5/user_account/analytics
 *   - Boards:    GET  https://api.pinterest.com/v5/boards
 *   - Publish:   POST https://api.pinterest.com/v5/pins (requires an image and a board)
 * Scopes: user_accounts:read, boards:read, pins:read, pins:write.
 * Trial-access apps can only use the sandbox. VERIFY AGAINST CURRENT DOCS BEFORE PRODUCTION.
 */
import { basicAuth, expiresFromNow, socialFetch, ymd } from "../http";
import { SocialApiError, type MetricValue, type SocialAdapter, type TokenSet } from "../types";

const clientId = () => process.env.PINTEREST_APP_ID ?? "";
const clientSecret = () => process.env.PINTEREST_APP_SECRET ?? "";
const SCOPES = ["user_accounts:read", "boards:read", "pins:read", "pins:write"];
const API = "https://api.pinterest.com/v5";

interface PinToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  refresh_token_expires_in?: number;
  scope: string;
}
interface PinAccount {
  username: string;
  profile_image?: string;
  account_type?: string;
  follower_count?: number;
  id?: string;
}

const toTokens = (t: PinToken, prev?: TokenSet): TokenSet => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token ?? prev?.refreshToken ?? null,
  expiresAt: expiresFromNow(t.expires_in),
  refreshExpiresAt: expiresFromNow(t.refresh_token_expires_in) ?? prev?.refreshExpiresAt ?? null,
  tokenType: "bearer",
  scopes: t.scope.split(/[ ,]/).filter(Boolean),
});

const account = (token: string) => socialFetch<PinAccount>("pinterest", `${API}/user_account`, { bearer: token });

export const pinterestAdapter: SocialAdapter = {
  platform: "pinterest",
  requiredEnv: ["PINTEREST_APP_ID", "PINTEREST_APP_SECRET"],
  isConfigured: () => Boolean(clientId() && clientSecret()),
  usesPkce: false,
  scopes: SCOPES,
  getAuthorizationUrl: ({ redirectUri, state }) =>
    `https://www.pinterest.com/oauth/?${new URLSearchParams({
      client_id: clientId(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(","),
      state,
    })}`,
  async exchangeCode(code, redirectUri) {
    const t = await socialFetch<PinToken>("pinterest", `${API}/oauth/token`, {
      method: "POST",
      headers: { Authorization: basicAuth(clientId(), clientSecret()) },
      form: { grant_type: "authorization_code", code, redirect_uri: redirectUri },
    });
    const a = await account(t.access_token);
    return [
      {
        providerAccountId: a.id ?? a.username,
        username: a.username,
        displayName: a.username,
        avatarUrl: a.profile_image ?? null,
        accountType: a.account_type?.toLowerCase() ?? null,
        tokens: toTokens(t),
      },
    ];
  },
  async refreshTokens(tokens) {
    if (!tokens.refreshToken) throw new SocialApiError("Pinterest access expired. Reconnect your account.", "pinterest", false, 401, true);
    const t = await socialFetch<PinToken>("pinterest", `${API}/oauth/token`, {
      method: "POST",
      headers: { Authorization: basicAuth(clientId(), clientSecret()) },
      form: { grant_type: "refresh_token", refresh_token: tokens.refreshToken },
    });
    return toTokens(t, tokens);
  },
  async fetchFollowers(tokens) {
    const a = await account(tokens.accessToken);
    return typeof a.follower_count === "number" ? a.follower_count : null;
  },
  async fetchMetrics(tokens, _acct, since, until) {
    const qs = new URLSearchParams({
      start_date: ymd(since),
      end_date: ymd(until),
      metric_types: "IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK",
    });
    const res = await socialFetch<{ all?: { daily_metrics?: { date: string; data_status: string; metrics?: Record<string, number> }[] } }>(
      "pinterest",
      `${API}/user_account/analytics?${qs}`,
      { bearer: tokens.accessToken },
    );
    const keyMap: Record<string, string> = { IMPRESSION: "impressions", SAVE: "saves", PIN_CLICK: "pin_clicks", OUTBOUND_CLICK: "outbound_clicks" };
    const out: MetricValue[] = [];
    for (const day of res.all?.daily_metrics ?? []) {
      if (day.data_status !== "READY" || !day.metrics) continue;
      for (const [name, value] of Object.entries(day.metrics)) {
        if (keyMap[name] && typeof value === "number") out.push({ date: day.date, key: keyMap[name], platformName: name, value });
      }
    }
    const followers = (await account(tokens.accessToken)).follower_count;
    if (typeof followers === "number") out.push({ date: ymd(until), key: "followers", platformName: "follower_count", value: followers });
    return out;
  },
  async publish(tokens, _acct, input) {
    const image = input.media.find((m) => m.kind === "image");
    if (!image || input.media.some((m) => m.kind === "video")) {
      throw new SocialApiError("Pinterest pins need one image. Video pins must be published manually.", "pinterest", false);
    }
    let boardId = tokens.extra?.boardId;
    if (!boardId) {
      const boards = await socialFetch<{ items: { id: string }[] }>("pinterest", `${API}/boards?page_size=1`, { bearer: tokens.accessToken });
      boardId = boards.items?.[0]?.id;
    }
    if (!boardId) throw new SocialApiError("Create a Pinterest board first, then try again.", "pinterest", false);
    const pin = await socialFetch<{ id: string }>("pinterest", `${API}/pins`, {
      method: "POST",
      bearer: tokens.accessToken,
      json: { board_id: boardId, description: input.text.slice(0, 500), media_source: { source_type: "image_url", url: image.url } },
    });
    return { providerPostId: pin.id, url: `https://www.pinterest.com/pin/${pin.id}/` };
  },
};
