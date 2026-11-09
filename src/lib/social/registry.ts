import "server-only";
import type { PlatformId } from "@/config/platforms";
import { facebookAdapter, instagramAdapter } from "./adapters/meta";
import { threadsAdapter } from "./adapters/threads";
import { tiktokAdapter } from "./adapters/tiktok";
import { youtubeAdapter } from "./adapters/youtube";
import { linkedinAdapter } from "./adapters/linkedin";
import { xAdapter } from "./adapters/x";
import { pinterestAdapter } from "./adapters/pinterest";
import type { SocialAdapter } from "./types";

const ADAPTERS: Record<PlatformId, SocialAdapter> = {
  instagram: instagramAdapter,
  facebook: facebookAdapter,
  threads: threadsAdapter,
  tiktok: tiktokAdapter,
  youtube: youtubeAdapter,
  linkedin: linkedinAdapter,
  x: xAdapter,
  pinterest: pinterestAdapter,
};

export function getAdapter(platform: PlatformId): SocialAdapter {
  return ADAPTERS[platform];
}

/** Configuration status per platform (env vars present), safe to send to the client. */
export function integrationStatus(): Record<PlatformId, { configured: boolean; requiredEnv: string[] }> {
  return Object.fromEntries(
    Object.entries(ADAPTERS).map(([id, a]) => [id, { configured: a.isConfigured(), requiredEnv: a.requiredEnv }]),
  ) as Record<PlatformId, { configured: boolean; requiredEnv: string[] }>;
}
