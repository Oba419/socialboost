import { MessagesSquare } from "lucide-react";
import { GrowthCoach } from "@/features/ai-studio/coach/growth-coach";
import { ToolPage } from "@/features/ai-studio/tool-page";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";

export const metadata = { title: "AI Growth Coach" };

export default async function CoachPage() {
  const { ent, locked } = await loadDashboardPage("growth_coach");
  const aiReady = isOpenAIConfigured();
  return (
    <ToolPage
      icon={MessagesSquare}
      title="AI Growth Coach"
      description="Practical, personalised advice for sustainable organic growth. No guarantees — just better decisions to test."
      feature="growth_coach"
      locked={locked}
      planName={ent.plan.name}
      aiReady={aiReady}
    >
      <GrowthCoach aiReady={aiReady} />
    </ToolPage>
  );
}
