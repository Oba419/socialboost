import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { assertFeature } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { updateCompetitorSchema } from "@/features/competitors/server";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

export const GET = route<Ctx>(async (_req, { params }) => {
  const ctx = await requireApiUser();
  await assertFeature(ctx, "competitor_research");
  const id = idSchema.parse((await params).id);
  const supabase = await createClient();
  const { data: competitor } = await supabase.from("competitors").select("*").eq("id", id).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!competitor) throw new AppError("NOT_FOUND", "Competitor not found.");
  const { data: snapshots } = await supabase
    .from("competitor_snapshots")
    .select("*")
    .eq("competitor_id", id)
    .order("captured_at", { ascending: true });
  return { competitor, snapshots: snapshots ?? [] };
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  await assertFeature(ctx, "competitor_research");
  const id = idSchema.parse((await params).id);
  const input = await parseJson(req, updateCompetitorSchema);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitors")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.platform !== undefined && { platform: input.platform }),
      ...(input.handle !== undefined && { handle: input.handle ? input.handle.replace(/^@/, "") : null }),
      ...(input.profileUrl !== undefined && { profile_url: input.profileUrl || null }),
      ...(input.notes !== undefined && { notes: input.notes }),
    })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .select("*")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not update the competitor.");
  if (!data) throw new AppError("NOT_FOUND", "Competitor not found.");
  return data;
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("competitors")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the competitor.");
  if (!count) throw new AppError("NOT_FOUND", "Competitor not found.");
  return { deleted: true };
});
