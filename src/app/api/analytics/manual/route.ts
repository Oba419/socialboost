import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { replaceMetrics } from "@/lib/social/metrics-store";
import { createClient } from "@/lib/supabase/server";
import { manualMetricsSchema } from "@/features/analytics/schemas";

/** POST /api/analytics/manual — record manually entered / imported figures (labelled as such). */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  await rateLimit("write", ctx.userId);
  const input = await parseJson(req, manualMetricsSchema);
  const supabase = await createClient();

  if (input.socialAccountId) {
    const { data: acct } = await supabase
      .from("social_accounts")
      .select("id, platform")
      .eq("id", input.socialAccountId)
      .eq("organization_id", ctx.organization.id)
      .maybeSingle();
    if (!acct) throw new AppError("NOT_FOUND", "Account not found.");
    if (acct.platform !== input.platform) throw new AppError("VALIDATION_ERROR", "The account belongs to a different platform.");
  }

  // RLS: insert/delete allowed only for editors and only for manual/import sources.
  const count = await replaceMetrics(supabase, {
    organizationId: ctx.organization.id,
    platform: input.platform,
    socialAccountId: input.socialAccountId ?? null,
    source: input.source,
    createdBy: ctx.userId,
    values: Object.entries(input.metrics).map(([key, value]) => ({
      date: input.date,
      key,
      platformName: `${input.source} entry`,
      value: Number(value),
    })),
  });
  return { saved: count };
});

/** DELETE /api/analytics/manual?id=<uuid> — remove one manual/imported row. */
export const DELETE = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = z.string().uuid().parse(req.nextUrl.searchParams.get("id"));
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("social_account_metrics")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .in("source", ["manual", "import"]);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the entry.");
  if (!count) throw new AppError("NOT_FOUND", "Entry not found (only manual or imported entries can be deleted).");
  return { deleted: true };
});
