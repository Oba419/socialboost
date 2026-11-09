import { Sparkles } from "lucide-react";
import { ContentStudio } from "@/features/ai-studio/studio/content-studio";
import { RecentGenerations, type RecentItem } from "@/features/ai-studio/studio/recent-generations";
import { ToolPage } from "@/features/ai-studio/tool-page";
import { first } from "@/features/ai-studio/shared";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "AI Studio" };

const PAGE_SIZE = 8;

export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { ctx, ent, locked } = await loadDashboardPage("content_studio");
  const aiReady = isOpenAIConfigured();
  const page = Math.max(1, Number(first(sp.page)) || 1);

  let items: RecentItem[] = [];
  let total = 0;
  if (!locked) {
    const supabase = await createClient();
    const { data, count } = await supabase
      .from("generated_content")
      .select("id, title, platform, body_text, is_saved, rating, created_at", { count: "exact" })
      .eq("organization_id", ctx.organization.id)
      .eq("service", "content_studio")
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    items = (data ?? []) as RecentItem[];
    total = count ?? 0;
  }

  return (
    <ToolPage
      icon={Sparkles}
      title="AI Studio"
      description="Generate original, platform-native posts tailored to your brand, audience and objective."
      feature="content_studio"
      locked={locked}
      planName={ent.plan.name}
      aiReady={aiReady}
    >
      <ContentStudio
        aiReady={aiReady}
        defaults={{
          platform: first(sp.platform) ?? ctx.organization.platforms[0],
          topic: first(sp.topic),
          format: first(sp.format),
          niche: ctx.organization.niche ?? undefined,
          audience: first(sp.audience) ?? ctx.organization.target_audience ?? undefined,
        }}
      />
      <RecentGenerations items={items} page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} basePath="/dashboard/studio" />
    </ToolPage>
  );
}
