import { Repeat2 } from "lucide-react";
import { z } from "zod";
import { RepurposeTool } from "@/features/ai-studio/repurpose/repurpose-tool";
import { ToolPage } from "@/features/ai-studio/tool-page";
import { first } from "@/features/ai-studio/shared";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";

export const metadata = { title: "Content Repurposing" };

export default async function RepurposePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { ent, locked } = await loadDashboardPage("content_repurposing");
  const aiReady = isOpenAIConfigured();
  const from = z.string().uuid().safeParse(first(sp.from));
  return (
    <ToolPage
      icon={Repeat2}
      title="Content Repurposing"
      description="Turn one piece of content into carousels, scripts, posts and threads adapted to each platform."
      feature="content_repurposing"
      locked={locked}
      planName={ent.plan.name}
      aiReady={aiReady}
    >
      <RepurposeTool aiReady={aiReady} fromId={from.success ? from.data : undefined} />
    </ToolPage>
  );
}
