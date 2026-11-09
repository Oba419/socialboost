import { TrendingUp } from "lucide-react";
import { TrendDiscovery } from "@/features/ai-studio/trends/trend-discovery";
import { ToolPage } from "@/features/ai-studio/tool-page";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";

export const metadata = { title: "Trend Discovery" };

export default async function TrendsPage() {
  const { ctx, ent, locked } = await loadDashboardPage("trend_discovery");
  const aiReady = isOpenAIConfigured();
  const org = ctx.organization;
  return (
    <ToolPage
      icon={TrendingUp}
      title="Trend Discovery"
      description="Emerging discussion themes, audience questions and content angles for your niche — labelled as ideas, not verified trends."
      feature="trend_discovery"
      locked={locked}
      planName={ent.plan.name}
      aiReady={aiReady}
    >
      <TrendDiscovery
        aiReady={aiReady}
        defaults={{ niche: org.niche ?? undefined, audience: org.target_audience ?? undefined, location: org.location ?? undefined }}
      />
    </ToolPage>
  );
}
