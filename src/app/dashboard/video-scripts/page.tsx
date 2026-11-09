import { Video } from "lucide-react";
import { VideoScriptGenerator } from "@/features/ai-studio/video-scripts/video-script-generator";
import { ToolPage } from "@/features/ai-studio/tool-page";
import { first } from "@/features/ai-studio/shared";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";

export const metadata = { title: "Video Script Generator" };

export default async function VideoScriptsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { ent, locked } = await loadDashboardPage("video_scripts");
  const aiReady = isOpenAIConfigured();
  return (
    <ToolPage
      icon={Video}
      title="Video Script Generator"
      description="Scripts for TikTok, Reels, Shorts and YouTube with hooks, scenes, voiceover and on-screen text."
      feature="video_scripts"
      locked={locked}
      planName={ent.plan.name}
      aiReady={aiReady}
    >
      <VideoScriptGenerator aiReady={aiReady} defaultTopic={first(sp.topic)?.slice(0, 300)} />
    </ToolPage>
  );
}
