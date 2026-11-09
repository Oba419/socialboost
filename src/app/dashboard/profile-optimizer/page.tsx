import { UserRoundSearch } from "lucide-react";
import { ProfileOptimizer } from "@/features/ai-studio/profile-optimizer/profile-optimizer";
import { ToolPage } from "@/features/ai-studio/tool-page";
import { isPlatformId } from "@/config/platforms";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";

export const metadata = { title: "Profile Optimizer" };

export default async function ProfileOptimizerPage() {
  const { ctx, ent, locked } = await loadDashboardPage("profile_optimizer");
  const aiReady = isOpenAIConfigured();
  const p = ctx.organization.platforms[0];
  return (
    <ToolPage
      icon={UserRoundSearch}
      title="Profile Optimizer"
      description="Assess positioning, bio clarity, keywords and CTA, and get alternative bios. Only the details you enter are analysed."
      feature="profile_optimizer"
      locked={locked}
      planName={ent.plan.name}
      aiReady={aiReady}
    >
      <ProfileOptimizer aiReady={aiReady} defaultPlatform={p && isPlatformId(p) ? p : undefined} />
    </ToolPage>
  );
}
