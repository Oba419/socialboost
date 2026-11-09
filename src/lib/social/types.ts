import type { PlatformId } from "@/config/platforms";

/**
 * Contract every platform adapter implements. Adapters talk ONLY to official
 * APIs via OAuth; they never handle user passwords or scrape.
 */

export interface TokenSet {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  refreshExpiresAt?: Date | null;
  tokenType?: string | null;
  scopes: string[];
  /** Platform-specific secrets (e.g. a Facebook Page token). Stored encrypted. */
  extra?: Record<string, string> | null;
}

export interface ProviderAccount {
  providerAccountId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  accountType: string | null;
}

export interface ConnectedAccountResult extends ProviderAccount {
  /** Per-account tokens when the platform issues them (e.g. Facebook Pages). */
  tokens: TokenSet;
}

export interface MetricValue {
  /** yyyy-MM-dd (UTC) */
  date: string;
  /** Internal normalised key, e.g. "followers", "impressions". */
  key: string;
  /** The platform's own metric name, preserved for transparency. */
  platformName: string;
  value: number;
}

export interface PublishMedia {
  /** Short-lived signed URL the platform can fetch. */
  url: string;
  mimeType: string;
  kind: "image" | "video";
}

export interface PublishInput {
  text: string;
  media: PublishMedia[];
}

export interface PublishResult {
  providerPostId: string;
  url: string | null;
}

export interface OAuthStart {
  redirectUri: string;
  state: string;
  /** PKCE S256 challenge, when `usesPkce`. */
  codeChallenge?: string;
}

export interface SocialAdapter {
  platform: PlatformId;
  /** Environment variables this adapter needs. */
  requiredEnv: string[];
  isConfigured(): boolean;
  usesPkce: boolean;
  scopes: string[];
  getAuthorizationUrl(params: OAuthStart): string;
  /** Exchange the code; returns one or more accounts the user authorised. */
  exchangeCode(code: string, redirectUri: string, codeVerifier?: string): Promise<ConnectedAccountResult[]>;
  refreshTokens?(tokens: TokenSet): Promise<TokenSet>;
  fetchFollowers?(tokens: TokenSet, account: ProviderAccount): Promise<number | null>;
  fetchMetrics?(tokens: TokenSet, account: ProviderAccount, since: Date, until: Date): Promise<MetricValue[]>;
  publish?(tokens: TokenSet, account: ProviderAccount, input: PublishInput): Promise<PublishResult>;
  revoke?(tokens: TokenSet): Promise<void>;
}

/** Errors adapters throw so callers can decide whether to retry. */
export class SocialApiError extends Error {
  constructor(
    message: string,
    public readonly platform: PlatformId,
    public readonly retryable: boolean,
    public readonly status?: number,
    /** True when the token is invalid/revoked and the account needs reconnecting. */
    public readonly authExpired = false,
  ) {
    super(message);
    this.name = "SocialApiError";
  }
}
