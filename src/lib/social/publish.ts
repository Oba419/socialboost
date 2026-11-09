import "server-only";
import { canPublishDirectly, PLATFORMS, type PlatformId } from "@/config/platforms";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapter } from "./registry";
import { getValidTokens, toProviderAccount } from "./tokens";
import { SocialApiError, type PublishInput, type PublishResult } from "./types";

/**
 * Publish to a connected account using its stored (encrypted) tokens.
 *
 * CONTRACT (used by the scheduling worker, implemented by the social
 * integrations module):
 *  - Loads the social account + tokens with the service role.
 *  - Refreshes tokens when needed.
 *  - Throws SocialApiError (retryable flag set appropriately) on failure.
 *  - Resolves ONLY when the platform API confirmed the post was created.
 */
export async function publishPost(params: { socialAccountId: string; input: PublishInput }): Promise<PublishResult> {
  const admin = createAdminClient();
  const { data: account } = await admin.from("social_accounts").select("*").eq("id", params.socialAccountId).maybeSingle();
  if (!account) throw new SocialApiError("The connected account no longer exists.", "x", false);
  const platform = account.platform as PlatformId;

  if (account.status !== "connected") {
    throw new SocialApiError(`This ${PLATFORMS[platform].name} account needs to be reconnected.`, platform, false, 401, true);
  }

  const kind = mediaKind(params.input);
  if (!canPublishDirectly(platform, kind)) {
    throw new SocialApiError(
      `Direct publishing of ${kind} posts to ${PLATFORMS[platform].name} isn't available. Use the manual publishing workflow.`,
      platform,
      false,
    );
  }
  const adapter = getAdapter(platform);
  if (!adapter.publish || !adapter.isConfigured()) {
    throw new SocialApiError(`${PLATFORMS[platform].name} publishing is not configured.`, platform, false);
  }

  const limit = PLATFORMS[platform].textLimit;
  if (limit !== null && params.input.text.length > limit) {
    throw new SocialApiError(`The post exceeds ${PLATFORMS[platform].name}'s ${limit}-character limit.`, platform, false);
  }

  const tokens = await getValidTokens(admin, account);
  const result = await adapter.publish(tokens, toProviderAccount(account), params.input);
  // Not retryable: the post may exist on the platform, and retrying could duplicate it.
  if (!result.providerPostId) {
    throw new SocialApiError("The platform did not confirm publication. Check the platform before retrying.", platform, false);
  }
  return result;
}

export function mediaKind(input: PublishInput): "text" | "image" | "video" {
  if (input.media.some((m) => m.kind === "video")) return "video";
  if (input.media.some((m) => m.kind === "image")) return "image";
  return "text";
}
