import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { assertFeature } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { snapshotSchema } from "@/features/competitors/server";

/** POST /api/competitors/:id/snapshots — record a manual observation of public metrics. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  await assertFeature(ctx, "competitor_research");
  const id = z.string().uuid().parse((await params).id);
  const input = await parseJson(req, snapshotSchema);
  const supabase = await createClient();

  const { data: competitor } = await supabase.from("competitors").select("id").eq("id", id).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!competitor) throw new AppError("NOT_FOUND", "Competitor not found.");

  const capturedAt = input.capturedAt ? new Date(input.capturedAt) : new Date();
  if (capturedAt.getTime() > Date.now() + 60_000) throw new AppError("VALIDATION_ERROR", "The observation date can't be in the future.");

  const { data, error } = await supabase
    .from("competitor_snapshots")
    .insert({
      competitor_id: id,
      organization_id: ctx.organization.id,
      captured_at: capturedAt.toISOString(),
      followers: input.followers ?? null,
      posts_per_week: input.postsPerWeek ?? null,
      avg_engagement: input.avgEngagement ?? null,
      content_themes: input.contentThemes,
      source: "manual",
      created_by: ctx.userId,
    })
    .select("*")
    .single();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not save the snapshot.");
  return data;
});
