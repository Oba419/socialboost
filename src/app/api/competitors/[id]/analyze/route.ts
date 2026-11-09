import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { runAIService } from "@/lib/ai/runner";
import { competitorAnalysisService, type CompetitorAnalysisData } from "@/lib/ai/services/competitor-analysis";
import type { Json } from "@/types/database";
import { analyzeSchema } from "@/features/competitors/server";

export const maxDuration = 120;

/**
 * POST /api/competitors/:id/analyze — AI analysis using ONLY the competitor
 * data saved in this workspace (manual observations / authorised API data).
 */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = z.string().uuid().parse((await params).id);
  const input = await parseJson(req, analyzeSchema);
  const supabase = await createClient();

  const { data: competitor } = await supabase.from("competitors").select("*").eq("id", id).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!competitor) throw new AppError("NOT_FOUND", "Competitor not found.");
  const { data: snapshots } = await supabase
    .from("competitor_snapshots")
    .select("*")
    .eq("competitor_id", id)
    .order("captured_at", { ascending: true })
    .limit(30);

  if (!competitor.notes && !snapshots?.length) {
    throw new AppError("VALIDATION_ERROR", "Add notes or at least one snapshot of public observations before running an analysis.");
  }

  const data: CompetitorAnalysisData = {
    name: competitor.name,
    platform: competitor.platform,
    handle: competitor.handle,
    notes: competitor.notes,
    snapshots: (snapshots ?? []).map((s) => ({
      capturedAt: s.captured_at,
      followers: s.followers,
      postsPerWeek: s.posts_per_week,
      avgEngagement: s.avg_engagement,
      contentThemes: s.content_themes,
    })),
  };

  // assertFeature("competitor_research") is enforced inside the runner.
  const result = await runAIService(competitorAnalysisService, ctx, { data, extra: input.extra });

  const latest = snapshots?.[snapshots.length - 1];
  if (latest) {
    await supabase.from("competitor_snapshots").update({ analysis: result.output as unknown as Json }).eq("id", latest.id);
  }

  return { analysis: result.output, snapshotId: latest?.id ?? null, creditsUsed: result.creditsUsed, creditsRemaining: result.creditsRemaining };
});
