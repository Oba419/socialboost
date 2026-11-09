import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { assertFeature } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { createCompetitorSchema } from "@/features/competitors/server";

/** GET /api/competitors — saved competitors with their latest snapshot. */
export const GET = route(async () => {
  const ctx = await requireApiUser();
  await assertFeature(ctx, "competitor_research");
  const supabase = await createClient();
  const { data: competitors, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load competitors.");
  const ids = (competitors ?? []).map((c) => c.id);
  const { data: snaps } = ids.length
    ? await supabase.from("competitor_snapshots").select("*").in("competitor_id", ids).order("captured_at", { ascending: false })
    : { data: [] };
  return (competitors ?? []).map((c) => ({ ...c, latestSnapshot: (snaps ?? []).find((s) => s.competitor_id === c.id) ?? null }));
});

/** POST /api/competitors — add a competitor profile manually. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  await assertFeature(ctx, "competitor_research");
  await rateLimit("write", ctx.userId);
  const input = await parseJson(req, createCompetitorSchema);
  const supabase = await createClient();

  const { count } = await supabase.from("competitors").select("id", { count: "exact", head: true }).eq("organization_id", ctx.organization.id);
  if ((count ?? 0) >= 50) throw new AppError("QUOTA_EXCEEDED", "You can track up to 50 competitors per workspace.");

  const { data, error } = await supabase
    .from("competitors")
    .insert({
      organization_id: ctx.organization.id,
      created_by: ctx.userId,
      name: input.name,
      platform: input.platform,
      handle: input.handle,
      profile_url: input.profileUrl,
      notes: input.notes,
    })
    .select("*")
    .single();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not add the competitor.");
  return data;
});
