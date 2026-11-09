import { Lightbulb } from "lucide-react";
import { IdeasWorkspace } from "@/features/ai-studio/ideas/ideas-workspace";
import { ToolPage } from "@/features/ai-studio/tool-page";
import { first } from "@/features/ai-studio/shared";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";

export const metadata = { title: "Content Ideas" };

export default async function IdeasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { ent, locked } = await loadDashboardPage("content_ideas");
  const aiReady = isOpenAIConfigured();
  return (
    <ToolPage
      icon={Lightbulb}
      title="Content Ideas"
      description="Daily, weekly and monthly ideas with hooks, CTAs and the reasoning behind each one."
      feature="content_ideas"
      locked={locked}
      planName={ent.plan.name}
      aiReady={aiReady}
    >
      <IdeasWorkspace aiReady={aiReady} initialTab={first(sp.tab) === "saved" ? "saved" : "generate"} />
    </ToolPage>
  );
}
