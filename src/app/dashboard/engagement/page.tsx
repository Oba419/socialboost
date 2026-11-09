import { MessageCircleHeart } from "lucide-react";
import { EngagementAssistant } from "@/features/ai-studio/engagement/engagement-assistant";
import { ToolPage } from "@/features/ai-studio/tool-page";
import { isPlatformId } from "@/config/platforms";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";

export const metadata = { title: "Engagement Assistant" };

export default async function EngagementPage() {
  const { ctx, ent, locked } = await loadDashboardPage("engagement_assistant");
  const aiReady = isOpenAIConfigured();
  const p = ctx.organization.platforms[0];
  return (
    <ToolPage
      icon={MessageCircleHeart}
      title="Engagement Assistant"
      description="Reply drafts, conversation starters and community ideas that help you build genuine relationships."
      feature="engagement_assistant"
      locked={locked}
      planName={ent.plan.name}
      aiReady={aiReady}
    >
      <EngagementAssistant aiReady={aiReady} defaultPlatform={p && isPlatformId(p) ? p : undefined} />
    </ToolPage>
  );
}
