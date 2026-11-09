import "server-only";
/**
 * Threads API adapter.
 *   - Authorize:      https://threads.net/oauth/authorize
 *   - Token:          POST https://graph.threads.net/oauth/access_token
 *   - Long-lived:     GET  https://graph.threads.net/access_token?grant_type=th_exchange_token
 *   - Refresh:        GET  https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token
 *   - Profile:        GET  https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url
 *   - Insights:       GET  https://graph.threads.net/v1.0/{user-id}/threads_insights
 *   - Publish:        POST /v1.0/{user-id}/threads → POST /v1.0/{user-id}/threads_publish
 * Scopes: threads_basic, threads_content_publish, threads_manage_insights.
 * VERIFY AGAINST CURRENT DOCS BEFORE PRODUCTION.
 */
import { expiresFromNow, socialFetch, ymd } from "../http";
import { SocialApiError, type MetricValue, type SocialAdapter, type TokenSet } from "../types";

const BASE = "https://graph.threads.net";
const clientId = () => process.env.THREADS_APP_ID ?? "";
const clientSecret = () => process.env.THREADS_APP_SECRET ?? "";
const SCOPES = ["threads_basic", "threads_content_publish", "threads_manage_insights"];

export const threadsAdapter: SocialAdapter = {
  platform: "threads",
  requiredEnv: ["THREADS_APP_ID", "THREADS_APP_SECRET"],
  isConfigured: () => Boolean(clientId() && clientSecret()),
  usesPkce: false,
  scopes: SCOPES,
  getAuthorizationUrl: ({ redirectUri, state }) =>
    `https://threads.net/oauth/authorize?${new URLSearchParams({
      client_id: clientId(),
      redirect_uri: redirectUri,
      scope: SCOPES.join(","),
      response_type: "code",
      state,
    })}`,
  async exchangeCode(code, redirectUri) {
    const short = await socialFetch<{ access_token: string; user_id: string | number }>("threads", `${BASE}/oauth/access_token`, {
      method: "POST",
      form: { client_id: clientId(), client_secret: clientSecret(), grant_type: "authorization_code", redirect_uri: redirectUri, code },
    });
    const long = await socialFetch<{ access_token: string; expires_in: number }>(
      "threads",
      `${BASE}/access_token?${new URLSearchParams({ grant_type: "th_exchange_token", client_secret: clientSecret(), access_token: short.access_token })}`,
    );
    const me = await socialFetch<{ id: string; username?: string; name?: string; threads_profile_picture_url?: string }>(
      "threads",
      `${BASE}/v1.0/me?fields=id,username,name,threads_profile_picture_url`,
      { bearer: long.access_token },
    );
    return [
      {
        providerAccountId: String(me.id ?? short.user_id),
        username: me.username ?? null,
        displayName: me.name ?? me.username ?? null,
        avatarUrl: me.threads_profile_picture_url ?? null,
        accountType: "profile",
        tokens: { accessToken: long.access_token, expiresAt: expiresFromNow(long.expires_in), scopes: SCOPES, tokenType: "bearer" },
      },
    ];
  },
  async refreshTokens(tokens: TokenSet) {
    // Threads refreshes the long-lived token itself (no separate refresh token).
    const res = await socialFetch<{ access_token: string; expires_in: number }>(
      "threads",
      `${BASE}/refresh_access_token?${new URLSearchParams({ grant_type: "th_refresh_token", access_token: tokens.accessToken })}`,
    );
    return { ...tokens, accessToken: res.access_token, expiresAt: expiresFromNow(res.expires_in) };
  },
  async fetchFollowers(tokens, account) {
    const res = await socialFetch<{ data: { name: string; total_value?: { value: number } }[] }>(
      "threads",
      `${BASE}/v1.0/${account.providerAccountId}/threads_insights?metric=followers_count`,
      { bearer: tokens.accessToken },
    );
    const v = res.data?.find((d) => d.name === "followers_count")?.total_value?.value;
    return typeof v === "number" ? v : null;
  },
  async fetchMetrics(tokens, account, since, until) {
    const qs = new URLSearchParams({
      metric: "views,likes,replies,reposts,quotes",
      since: String(Math.floor(since.getTime() / 1000)),
      until: String(Math.floor(until.getTime() / 1000)),
    });
    const res = await socialFetch<{ data: { name: string; values?: { value: number; end_time: string }[]; total_value?: { value: number } }[] }>(
      "threads",
      `${BASE}/v1.0/${account.providerAccountId}/threads_insights?${qs}`,
      { bearer: tokens.accessToken },
    );
    const keyMap: Record<string, string> = { views: "views", likes: "likes", replies: "replies", reposts: "reposts", quotes: "quotes" };
    const out: MetricValue[] = [];
    for (const series of res.data ?? []) {
      const key = keyMap[series.name];
      if (!key) continue;
      if (series.values?.length) {
        for (const v of series.values) out.push({ date: ymd(new Date(new Date(v.end_time).getTime() - 1000)), key, platformName: series.name, value: v.value });
      } else if (series.total_value && ymd(since) === ymd(until)) {
        out.push({ date: ymd(until), key, platformName: series.name, value: series.total_value.value });
      }
    }
    return out;
  },
  async publish(tokens, account, input) {
    if (input.media.some((m) => m.kind === "video")) {
      throw new SocialApiError("Video publishing to Threads is not enabled in this app. Publish it manually.", "threads", false);
    }
    const image = input.media.find((m) => m.kind === "image");
    const container = await socialFetch<{ id: string }>("threads", `${BASE}/v1.0/${account.providerAccountId}/threads`, {
      method: "POST",
      bearer: tokens.accessToken,
      form: image ? { media_type: "IMAGE", image_url: image.url, text: input.text } : { media_type: "TEXT", text: input.text },
    });
    const published = await socialFetch<{ id: string }>("threads", `${BASE}/v1.0/${account.providerAccountId}/threads_publish`, {
      method: "POST",
      bearer: tokens.accessToken,
      form: { creation_id: container.id },
    });
    let url: string | null = null;
    try {
      url = (await socialFetch<{ permalink?: string }>("threads", `${BASE}/v1.0/${published.id}?fields=permalink`, { bearer: tokens.accessToken })).permalink ?? null;
    } catch {
      /* optional */
    }
    return { providerPostId: published.id, url };
  },
};
