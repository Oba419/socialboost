/**
 * Platform capability matrix.
 *
 * This is the single place that states what the app can do per platform via
 * OFFICIAL APIs. It reflects publicly documented capabilities; most of them
 * additionally require the platform to approve your developer app (see
 * `approvalNotes`). The UI reads this matrix to show what is available and to
 * route unsupported actions to a manual/export workflow.
 *
 * Verify against current platform documentation before going to production:
 * scopes and endpoints change. Links are in `docsUrl`.
 */

export type PlatformId =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "x"
  | "pinterest"
  | "threads";

export type CapabilityLevel = "supported" | "limited" | "unsupported";

export interface PlatformCapabilities {
  oauth: CapabilityLevel;
  profileInfo: CapabilityLevel;
  followerCount: CapabilityLevel;
  accountInsights: CapabilityLevel;
  postInsights: CapabilityLevel;
  publishText: CapabilityLevel;
  publishImage: CapabilityLevel;
  publishVideo: CapabilityLevel;
  scheduling: "native" | "app" | "manual";
}

export interface PlatformDefinition {
  id: PlatformId;
  name: string;
  /** Brand-ish accent used for small indicators only (not logos). */
  color: string;
  envPrefix: string;
  capabilities: PlatformCapabilities;
  /** Character limit for a standard post body, used for validation hints. */
  textLimit: number | null;
  /** Metric keys the platform can supply (our internal names). */
  metrics: string[];
  approvalNotes: string;
  docsUrl: string;
  /** Requirements on the user's account type. */
  accountRequirements: string;
}

export const PLATFORMS: Record<PlatformId, PlatformDefinition> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    color: "#E1306C",
    envPrefix: "META",
    capabilities: {
      oauth: "supported",
      profileInfo: "supported",
      followerCount: "supported",
      accountInsights: "supported",
      postInsights: "supported",
      publishText: "unsupported",
      publishImage: "supported",
      publishVideo: "limited",
      scheduling: "app",
    },
    textLimit: 2200,
    metrics: ["followers", "reach", "impressions", "profile_views", "likes", "comments", "saves", "shares", "video_views"],
    approvalNotes:
      "Uses the Instagram Graph API via a Meta developer app. Requires Meta App Review for instagram_basic, instagram_content_publish and instagram_manage_insights, plus Business Verification.",
    docsUrl: "https://developers.facebook.com/docs/instagram-platform",
    accountRequirements: "Instagram Professional (Business or Creator) account linked to a Facebook Page.",
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    envPrefix: "META",
    capabilities: {
      oauth: "supported",
      profileInfo: "supported",
      followerCount: "supported",
      accountInsights: "supported",
      postInsights: "supported",
      publishText: "supported",
      publishImage: "supported",
      publishVideo: "limited",
      scheduling: "app",
    },
    textLimit: 63206,
    metrics: ["followers", "reach", "impressions", "engagements", "likes", "comments", "shares", "video_views"],
    approvalNotes:
      "Uses the Pages API via a Meta developer app. Requires App Review for pages_manage_posts, pages_read_engagement and read_insights.",
    docsUrl: "https://developers.facebook.com/docs/pages-api",
    accountRequirements: "A Facebook Page you manage. Personal profiles cannot be published to via API.",
  },
  threads: {
    id: "threads",
    name: "Threads",
    color: "#8B5CF6",
    envPrefix: "THREADS",
    capabilities: {
      oauth: "supported",
      profileInfo: "supported",
      followerCount: "supported",
      accountInsights: "supported",
      postInsights: "supported",
      publishText: "supported",
      publishImage: "supported",
      publishVideo: "limited",
      scheduling: "app",
    },
    textLimit: 500,
    metrics: ["followers", "views", "likes", "replies", "reposts", "quotes"],
    approvalNotes:
      "Uses the Threads API (separate Meta app use case). Requires App Review for threads_basic, threads_content_publish and threads_manage_insights.",
    docsUrl: "https://developers.facebook.com/docs/threads",
    accountRequirements: "A Threads profile.",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    color: "#25F4EE",
    envPrefix: "TIKTOK",
    capabilities: {
      oauth: "supported",
      profileInfo: "supported",
      followerCount: "supported",
      accountInsights: "limited",
      postInsights: "limited",
      publishText: "unsupported",
      publishImage: "limited",
      publishVideo: "limited",
      scheduling: "manual",
    },
    textLimit: 2200,
    metrics: ["followers", "likes", "video_views", "comments", "shares"],
    approvalNotes:
      "Uses Login Kit + Display API (user.info.basic, user.info.stats, video.list). Content Posting API requires a separate audit; until audited, posts are restricted to private visibility, so this app uses a manual publishing workflow.",
    docsUrl: "https://developers.tiktok.com/doc/overview",
    accountRequirements: "Any TikTok account.",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    envPrefix: "GOOGLE",
    capabilities: {
      oauth: "supported",
      profileInfo: "supported",
      followerCount: "supported",
      accountInsights: "supported",
      postInsights: "supported",
      publishText: "unsupported",
      publishImage: "unsupported",
      publishVideo: "limited",
      scheduling: "manual",
    },
    textLimit: 5000,
    metrics: ["subscribers", "views", "watch_time_minutes", "likes", "comments", "video_count"],
    approvalNotes:
      "Uses YouTube Data API v3 and YouTube Analytics API. Sensitive scopes require Google OAuth verification. Uploads from unverified projects are locked to private, so video publishing uses a manual workflow until the project passes an audit.",
    docsUrl: "https://developers.google.com/youtube/v3",
    accountRequirements: "A YouTube channel.",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    envPrefix: "LINKEDIN",
    capabilities: {
      oauth: "supported",
      profileInfo: "supported",
      followerCount: "limited",
      accountInsights: "limited",
      postInsights: "limited",
      publishText: "supported",
      publishImage: "limited",
      publishVideo: "unsupported",
      scheduling: "app",
    },
    textLimit: 3000,
    metrics: ["followers", "impressions", "reactions", "comments", "shares", "clicks"],
    approvalNotes:
      "Personal posting uses 'Sign In with LinkedIn using OpenID Connect' + 'Share on LinkedIn' (w_member_social). Organization pages and analytics require the Community Management API, which needs LinkedIn approval.",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/",
    accountRequirements: "A LinkedIn member account (organization pages need extra approval).",
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    color: "#A1A1AA",
    envPrefix: "X",
    capabilities: {
      oauth: "supported",
      profileInfo: "supported",
      followerCount: "supported",
      accountInsights: "limited",
      postInsights: "limited",
      publishText: "supported",
      publishImage: "limited",
      publishVideo: "unsupported",
      scheduling: "app",
    },
    textLimit: 280,
    metrics: ["followers", "impressions", "likes", "replies", "reposts", "quotes"],
    approvalNotes:
      "Uses X API v2 with OAuth 2.0 PKCE (tweet.read, tweet.write, users.read, offline.access). Write access and metrics depend on your paid API access tier.",
    docsUrl: "https://docs.x.com/x-api/introduction",
    accountRequirements: "Any X account.",
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    color: "#E60023",
    envPrefix: "PINTEREST",
    capabilities: {
      oauth: "supported",
      profileInfo: "supported",
      followerCount: "supported",
      accountInsights: "supported",
      postInsights: "supported",
      publishText: "unsupported",
      publishImage: "supported",
      publishVideo: "limited",
      scheduling: "app",
    },
    textLimit: 500,
    metrics: ["followers", "impressions", "saves", "pin_clicks", "outbound_clicks"],
    approvalNotes:
      "Uses Pinterest API v5. New apps get Trial access (sandbox only); Standard access requires an app review.",
    docsUrl: "https://developers.pinterest.com/docs/getting-started/introduction/",
    accountRequirements: "A Pinterest business account is recommended for analytics.",
  },
};

export const PLATFORM_LIST: PlatformDefinition[] = Object.values(PLATFORMS);
export const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];

export function isPlatformId(value: string): value is PlatformId {
  return value in PLATFORMS;
}

export function canPublishDirectly(platform: PlatformId, mediaKind: "text" | "image" | "video"): boolean {
  const c = PLATFORMS[platform].capabilities;
  const level = mediaKind === "text" ? c.publishText : mediaKind === "image" ? c.publishImage : c.publishVideo;
  return level === "supported" && c.scheduling !== "manual";
}
