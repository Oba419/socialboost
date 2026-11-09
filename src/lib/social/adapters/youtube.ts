import "server-only";
/**
 * YouTube adapter (Google OAuth 2.0 + YouTube Data API v3 + YouTube Analytics API v2).
 *   - Authorize: https://accounts.google.com/o/oauth2/v2/auth (access_type=offline, prompt=consent)
 *   - Token:     POST https://oauth2.googleapis.com/token
 *   - Revoke:    POST https://oauth2.googleapis.com/revoke
 *   - Channel:   GET  https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true
 *   - Analytics: GET  https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&dimensions=day
 * Scopes: youtube.readonly, yt-analytics.readonly. Video upload is a manual
 * workflow (unaudited projects upload as private).
 * VERIFY AGAINST CURRENT DOCS BEFORE PRODUCTION.
 */
import { expiresFromNow, socialFetch, ymd } from "../http";
import { SocialApiError, type MetricValue, type SocialAdapter, type TokenSet } from "../types";

const clientId = () => process.env.GOOGLE_CLIENT_ID ?? "";
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET ?? "";
const SCOPES = ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly"];

interface GoogleToken {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}
interface Channel {
  id: string;
  snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string } } };
  statistics: { subscriberCount?: string; hiddenSubscriberCount?: boolean; viewCount?: string; videoCount?: string };
}

async function myChannel(token: string): Promise<Channel> {
  const res = await socialFetch<{ items?: Channel[] }>(
    "youtube",
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    { bearer: token },
  );
  const ch = res.items?.[0];
  if (!ch) throw new SocialApiError("This Google account has no YouTube channel.", "youtube", false);
  return ch;
}

export const youtubeAdapter: SocialAdapter = {
  platform: "youtube",
  requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  isConfigured: () => Boolean(clientId() && clientSecret()),
  usesPkce: true,
  scopes: SCOPES,
  getAuthorizationUrl: ({ redirectUri, state, codeChallenge }) =>
    `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
      ...(codeChallenge ? { code_challenge: codeChallenge, code_challenge_method: "S256" } : {}),
    })}`,
  async exchangeCode(code, redirectUri, codeVerifier) {
    const t = await socialFetch<GoogleToken>("youtube", "https://oauth2.googleapis.com/token", {
      method: "POST",
      form: {
        code,
        client_id: clientId(),
        client_secret: clientSecret(),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      },
    });
    const ch = await myChannel(t.access_token);
    return [
      {
        providerAccountId: ch.id,
        username: ch.snippet.customUrl ?? null,
        displayName: ch.snippet.title,
        avatarUrl: ch.snippet.thumbnails?.default?.url ?? null,
        accountType: "channel",
        tokens: {
          accessToken: t.access_token,
          refreshToken: t.refresh_token ?? null,
          expiresAt: expiresFromNow(t.expires_in),
          tokenType: t.token_type,
          scopes: t.scope.split(" "),
        },
      },
    ];
  },
  async refreshTokens(tokens: TokenSet) {
    if (!tokens.refreshToken) throw new SocialApiError("Reconnect YouTube to continue.", "youtube", false, 401, true);
    const t = await socialFetch<GoogleToken>("youtube", "https://oauth2.googleapis.com/token", {
      method: "POST",
      form: { client_id: clientId(), client_secret: clientSecret(), refresh_token: tokens.refreshToken, grant_type: "refresh_token" },
    });
    return { ...tokens, accessToken: t.access_token, expiresAt: expiresFromNow(t.expires_in), refreshToken: t.refresh_token ?? tokens.refreshToken };
  },
  async fetchFollowers(tokens) {
    const ch = await myChannel(tokens.accessToken);
    return ch.statistics.hiddenSubscriberCount || !ch.statistics.subscriberCount ? null : Number(ch.statistics.subscriberCount);
  },
  async fetchMetrics(tokens, _account, since, until) {
    const qs = new URLSearchParams({
      ids: "channel==MINE",
      startDate: ymd(since),
      endDate: ymd(until),
      metrics: "views,estimatedMinutesWatched,likes,comments,shares,subscribersGained",
      dimensions: "day",
      sort: "day",
    });
    const res = await socialFetch<{ columnHeaders: { name: string }[]; rows?: (string | number)[][] }>(
      "youtube",
      `https://youtubeanalytics.googleapis.com/v2/reports?${qs}`,
      { bearer: tokens.accessToken },
    );
    const keyMap: Record<string, string> = {
      views: "views",
      estimatedMinutesWatched: "watch_time_minutes",
      likes: "likes",
      comments: "comments",
      shares: "shares",
      subscribersGained: "subscribers_gained",
    };
    const headers = res.columnHeaders.map((h) => h.name);
    const out: MetricValue[] = [];
    for (const row of res.rows ?? []) {
      const date = String(row[headers.indexOf("day")]);
      headers.forEach((h, i) => {
        if (keyMap[h]) out.push({ date, key: keyMap[h], platformName: h, value: Number(row[i]) });
      });
    }
    return out;
  },
  async revoke(tokens) {
    await socialFetch("youtube", "https://oauth2.googleapis.com/revoke", {
      method: "POST",
      form: { token: tokens.refreshToken ?? tokens.accessToken },
    });
  },
};
