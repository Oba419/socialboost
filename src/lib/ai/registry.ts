import { contentStudioService } from "./services/content-studio";
import { contentIdeasService } from "./services/content-ideas";
import { captionsService } from "./services/captions";
import { hashtagsService } from "./services/hashtags";
import { videoScriptService } from "./services/video-script";
import { repurposeService } from "./services/repurpose";
import { profileOptimizerService } from "./services/profile-optimizer";
import { growthCoachService } from "./services/growth-coach";
import { trendsService } from "./services/trends";
import { engagementService } from "./services/engagement";

/**
 * Services callable through the generic POST /api/ai/[service] endpoint.
 * Growth plans, competitor analysis and performance reviews have dedicated
 * endpoints because they load/persist extra server-side data.
 */
export const DIRECT_AI_SERVICES = {
  content_studio: contentStudioService,
  content_ideas: contentIdeasService,
  captions: captionsService,
  hashtags: hashtagsService,
  video_script: videoScriptService,
  repurpose: repurposeService,
  profile_optimizer: profileOptimizerService,
  growth_coach: growthCoachService,
  trends: trendsService,
  engagement: engagementService,
} as const;

export type DirectAIServiceId = keyof typeof DIRECT_AI_SERVICES;

export function isDirectAIService(id: string): id is DirectAIServiceId {
  return id in DIRECT_AI_SERVICES;
}
