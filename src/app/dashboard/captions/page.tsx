import { Type } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { AIUnavailable } from "@/components/content/generation-states";
import { CaptionGenerator } from "@/features/ai-studio/captions/caption-generator";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";

export const metadata = { title: "Caption Generator" };

export default async function CaptionsPage() {
  const { ctx, ent, locked } = await loadDashboardPage("caption_generator");
  const aiReady = isOpenAIConfigured();
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Type}
        title="Caption Generator"
        description="Platform-specific captions in multiple styles, each with a natural call to action."
      />
      {locked ? (
        <UpgradePrompt feature="caption_generator" currentPlan={ent.plan.name} />
      ) : (
        <>
          {!aiReady && <AIUnavailable />}
          <CaptionGenerator aiReady={aiReady} defaultPlatform={ctx.organization.platforms[0]} />
        </>
      )}
    </div>
  );
}
