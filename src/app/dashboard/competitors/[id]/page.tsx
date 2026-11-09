import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { AIUnavailable } from "@/components/content/generation-states";
import { CompetitorDetail } from "@/features/competitors/competitor-detail";
import { loadDashboardPage } from "@/lib/auth/page";
import { isOpenAIConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Competitor" };

export default async function CompetitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ent, locked } = await loadDashboardPage("competitor_research");
  if (locked) return <UpgradePrompt feature="competitor_research" currentPlan={ent.plan.name} />;
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) notFound();

  const supabase = await createClient();
  const { data: competitor } = await supabase
    .from("competitors")
    .select("*")
    .eq("id", parsed.data)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!competitor) notFound();
  const { data: snapshots } = await supabase
    .from("competitor_snapshots")
    .select("*")
    .eq("competitor_id", competitor.id)
    .order("captured_at", { ascending: true });
  const aiReady = isOpenAIConfigured();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/competitors">
          <ArrowLeft className="size-4" /> All competitors
        </Link>
      </Button>
      {!aiReady && <AIUnavailable />}
      <CompetitorDetail competitor={competitor} snapshots={snapshots ?? []} aiReady={aiReady} canEdit={ctx.role !== "viewer"} />
    </div>
  );
}
