import { Hash } from "lucide-react";
import { HashtagResearch } from "@/features/ai-studio/hashtags/hashtag-research";
import { ToolPage } from "@/features/ai-studio/tool-page";
import { isPlatformId } from "@/config/platforms";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";

export const metadata = { title: "Hashtag Research" };

export default async function HashtagsPage() {
  const { ctx, ent, locked } = await loadDashboardPage("hashtag_research");
  const aiReady = isOpenAIConfigured();
  const p = ctx.organization.platforms[0];
  return (
    <ToolPage
      icon={Hash}
      title="Hashtag Research"
      description="Relevant hashtags grouped by reach. Suggestions are AI estimates unless verified on the platform."
      feature="hashtag_research"
      locked={locked}
      planName={ent.plan.name}
      aiReady={aiReady}
    >
      <HashtagResearch aiReady={aiReady} defaultPlatform={p && isPlatformId(p) ? p : undefined} defaultLocation={ctx.organization.location ?? undefined} />
    </ToolPage>
  );
}
