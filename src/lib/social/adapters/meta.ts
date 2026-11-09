import "server-only";
/**
 * Meta adapters: Facebook Pages + Instagram (Business/Creator) via Facebook Login.
 *
 * Endpoints (Graph API, version from META_GRAPH_VERSION, default v23.0):
 *   - Login dialog:      https://www.facebook.com/{v}/dialog/oauth
 *   - Code exchange:     GET /{v}/oauth/access_token
 *   - Long-lived token:  GET /{v}/oauth/access_token?grant_type=fb_exchange_token
 *   - Pages:             GET /{v}/me/accounts?fields=id,name,access_token,picture,followers_count,instagram_business_account{...}
 *   - FB insights:       GET /{v}/{page-id}/insights?metric=page_impressions,page_impressions_unique,page_post_engagements&period=day
 *   - IG insights:       GET /{v}/{ig-id}/insights?metric=reach&period=day
 *   - FB publish:        POST /{v}/{page-id}/feed (text), POST /{v}/{page-id}/photos (image)
 *   - IG publish:        POST /{v}/{ig-id}/media → POST /{v}/{ig-id}/media_publish
 *   - Revoke:            DELETE /{v}/me/permissions (user token)
 * Scopes: FB pages_show_list, pages_read_engagement, pages_manage_posts, read_insights;
 *         IG instagram_basic, instagram_content_publish, instagram_manage_insights, pages_show_list, pages_read_engagement.
 * Page tokens derived from a long-lived user token do not expire.
 * Meta deprecates insight metrics regularly — VERIFY AGAINST CURRENT DOCS BEFORE PRODUCTION.
 */
import type { PlatformId } from "@/config/platforms";
import { socialFetch, ymd } from "../http";
import {
  SocialApiError,
  type ConnectedAccountResult,
  type MetricValue,
  type ProviderAccount,
  type PublishInput,
  type PublishResult,
  type SocialAdapter,
  type TokenSet,
} from "../types";

const version = () => process.env.META_GRAPH_VERSION || "v23.0";
const graph = (path: string) => `https://graph.facebook.com/${version()}${path}`;
const appId = () => process.env.META_APP_ID ?? "";
const appSecret = () => process.env.META_APP_SECRET ?? "";

interface PageNode {
  id: string;
  name: string;
  access_token: string;
  followers_count?: number;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string; username?: string; profile_picture_url?: string; followers_count?: number };
}

async function exchangeForPages(platform: PlatformId, code: string, redirectUri: string): Promise<{ userToken: string; pages: PageNode[] }> {
  const short = await socialFetch<{ access_token: string }>(
    platform,
    `${graph("/oauth/access_token")}?${new URLSearchParams({ client_id: appId(), client_secret: appSecret(), redirect_uri: redirectUri, code })}`,
  );
  const long = await socialFetch<{ access_token: string }>(
    platform,
    `${graph("/oauth/access_token")}?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId(),
      client_secret: appSecret(),
      fb_exchange_token: short.access_token,
    })}`,
  );
  const fields = "id,name,access_token,followers_count,picture{url},instagram_business_account{id,username,profile_picture_url,followers_count}";
  const res = await socialFetch<{ data: PageNode[] }>(platform, `${graph("/me/accounts")}?fields=${encodeURIComponent(fields)}&limit=100`, {
    bearer: long.access_token,
  });
  return { userToken: long.access_token, pages: res.data ?? [] };
}

async function insights(platform: PlatformId, objectId: string, token: string, metric: string, since: Date, until: Date) {
  const qs = new URLSearchParams({
    metric,
    period: "day",
    since: String(Math.floor(since.getTime() / 1000)),
    until: String(Math.floor(until.getTime() / 1000)),
  });
  return socialFetch<{ data: { name: string; values: { value: number; end_time: string }[] }[] }>(
    platform,
    `${graph(`/${objectId}/insights`)}?${qs}`,
    { bearer: token },
  );
}

/** Fetch each metric separately so one deprecated metric doesn't fail the rest. */
async function collectInsights(
  platform: PlatformId,
  objectId: string,
  token: string,
  map: Record<string, string>,
  since: Date,
  until: Date,
): Promise<MetricValue[]> {
  const out: MetricValue[] = [];
  for (const [platformName, key] of Object.entries(map)) {
    try {
      const res = await insights(platform, objectId, token, platformName, since, until);
      for (const series of res.data ?? []) {
        for (const v of series.values ?? []) {
          if (typeof v.value !== "number") continue;
          // end_time marks the end of the day window; attribute to the previous day.
          const d = new Date(new Date(v.end_time).getTime() - 1000);
          out.push({ date: ymd(d), key, platformName, value: v.value });
        }
      }
    } catch (e) {
      if (e instanceof SocialApiError && (e.authExpired || e.retryable)) throw e;
      // Non-retryable metric errors (deprecated/unsupported metric): skip that metric.
    }
  }
  return out;
}

const tokensFor = (pageToken: string, userToken: string, scopes: string[]): TokenSet => ({
  accessToken: pageToken,
  refreshToken: null,
  expiresAt: null,
  tokenType: "page",
  scopes,
  extra: { userToken },
});

function authUrl(scopes: string[], { redirectUri, state }: { redirectUri: string; state: string }) {
  return `https://www.facebook.com/${version()}/dialog/oauth?${new URLSearchParams({
    client_id: appId(),
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: scopes.join(","),
  })}`;
}

async function revokeUser(platform: PlatformId, tokens: TokenSet) {
  const userToken = tokens.extra?.userToken;
  if (!userToken) return;
  await socialFetch(platform, graph("/me/permissions"), { method: "DELETE", bearer: userToken });
}

const FB_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "read_insights"];
const IG_SCOPES = ["instagram_basic", "instagram_content_publish", "instagram_manage_insights", "pages_show_list", "pages_read_engagement"];

export const facebookAdapter: SocialAdapter = {
  platform: "facebook",
  requiredEnv: ["META_APP_ID", "META_APP_SECRET"],
  isConfigured: () => Boolean(appId() && appSecret()),
  usesPkce: false,
  scopes: FB_SCOPES,
  getAuthorizationUrl: (p) => authUrl(FB_SCOPES, p),
  async exchangeCode(code, redirectUri): Promise<ConnectedAccountResult[]> {
    const { userToken, pages } = await exchangeForPages("facebook", code, redirectUri);
    if (!pages.length) throw new SocialApiError("No Facebook Pages were shared. Select at least one Page you manage.", "facebook", false);
    return pages.map((p) => ({
      providerAccountId: p.id,
      username: null,
      displayName: p.name,
      avatarUrl: p.picture?.data?.url ?? null,
      accountType: "page",
      tokens: tokensFor(p.access_token, userToken, FB_SCOPES),
    }));
  },
  async fetchFollowers(tokens, account) {
    const res = await socialFetch<{ followers_count?: number }>("facebook", `${graph(`/${account.providerAccountId}`)}?fields=followers_count`, {
      bearer: tokens.accessToken,
    });
    return typeof res.followers_count === "number" ? res.followers_count : null;
  },
  fetchMetrics: (tokens, account, since, until) =>
    collectInsights(
      "facebook",
      account.providerAccountId,
      tokens.accessToken,
      { page_impressions: "impressions", page_impressions_unique: "reach", page_post_engagements: "engagements" },
      since,
      until,
    ),
  async publish(tokens, account, input): Promise<PublishResult> {
    const image = input.media.find((m) => m.kind === "image");
    if (input.media.some((m) => m.kind === "video")) {
      throw new SocialApiError("Video publishing to Facebook is not enabled in this app. Publish it manually.", "facebook", false);
    }
    if (image) {
      const res = await socialFetch<{ id: string; post_id?: string }>("facebook", graph(`/${account.providerAccountId}/photos`), {
        method: "POST",
        bearer: tokens.accessToken,
        form: { url: image.url, caption: input.text },
      });
      const id = res.post_id ?? res.id;
      return { providerPostId: id, url: `https://www.facebook.com/${id}` };
    }
    const res = await socialFetch<{ id: string }>("facebook", graph(`/${account.providerAccountId}/feed`), {
      method: "POST",
      bearer: tokens.accessToken,
      form: { message: input.text },
    });
    return { providerPostId: res.id, url: `https://www.facebook.com/${res.id}` };
  },
  revoke: (tokens) => revokeUser("facebook", tokens),
};

export const instagramAdapter: SocialAdapter = {
  platform: "instagram",
  requiredEnv: ["META_APP_ID", "META_APP_SECRET"],
  isConfigured: () => Boolean(appId() && appSecret()),
  usesPkce: false,
  scopes: IG_SCOPES,
  getAuthorizationUrl: (p) => authUrl(IG_SCOPES, p),
  async exchangeCode(code, redirectUri): Promise<ConnectedAccountResult[]> {
    const { userToken, pages } = await exchangeForPages("instagram", code, redirectUri);
    const withIg = pages.filter((p) => p.instagram_business_account?.id);
    if (!withIg.length) {
      throw new SocialApiError(
        "No Instagram professional account was found. Link your Instagram Business/Creator account to a Facebook Page first.",
        "instagram",
        false,
      );
    }
    return withIg.map((p) => {
      const ig = p.instagram_business_account!;
      return {
        providerAccountId: ig.id,
        username: ig.username ?? null,
        displayName: ig.username ?? p.name,
        avatarUrl: ig.profile_picture_url ?? null,
        accountType: "professional",
        tokens: tokensFor(p.access_token, userToken, IG_SCOPES),
      };
    });
  },
  async fetchFollowers(tokens, account) {
    const res = await socialFetch<{ followers_count?: number }>("instagram", `${graph(`/${account.providerAccountId}`)}?fields=followers_count`, {
      bearer: tokens.accessToken,
    });
    return typeof res.followers_count === "number" ? res.followers_count : null;
  },
  fetchMetrics: (tokens, account, since, until) =>
    collectInsights("instagram", account.providerAccountId, tokens.accessToken, { reach: "reach" }, since, until),
  async publish(tokens, account: ProviderAccount, input: PublishInput): Promise<PublishResult> {
    const image = input.media.find((m) => m.kind === "image");
    if (!image || input.media.some((m) => m.kind === "video")) {
      throw new SocialApiError("Instagram direct publishing here supports a single image post. Publish other formats manually.", "instagram", false);
    }
    const container = await socialFetch<{ id: string }>("instagram", graph(`/${account.providerAccountId}/media`), {
      method: "POST",
      bearer: tokens.accessToken,
      form: { image_url: image.url, caption: input.text },
    });
    const published = await socialFetch<{ id: string }>("instagram", graph(`/${account.providerAccountId}/media_publish`), {
      method: "POST",
      bearer: tokens.accessToken,
      form: { creation_id: container.id },
    });
    let url: string | null = null;
    try {
      const meta = await socialFetch<{ permalink?: string }>("instagram", `${graph(`/${published.id}`)}?fields=permalink`, {
        bearer: tokens.accessToken,
      });
      url = meta.permalink ?? null;
    } catch {
      /* permalink is optional */
    }
    return { providerPostId: published.id, url };
  },
  revoke: (tokens) => revokeUser("instagram", tokens),
};
