import { z } from "zod";
import { FEATURE_KEYS } from "@/config/plans";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { clientIp } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/services/audit";
import type { Json } from "@/types/database";

const count = z.number().int().min(0).max(10_000_000);
const naira = z.number().min(0).max(100_000_000);

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300),
  priceMonthlyNaira: naira,
  priceAnnualNaira: naira,
  features: z.array(z.enum(FEATURE_KEYS)).max(FEATURE_KEYS.length),
  limits: z.object({
    aiCreditsPerPeriod: count,
    savedItems: count.nullable(),
    socialAccounts: count,
    scheduledPostsPerMonth: count.nullable(),
    workspaces: count.min(1),
    teamMembers: count.min(1),
    mediaStorageMb: count,
  }),
  isActive: z.boolean(),
  highlighted: z.boolean(),
  startingFrom: z.boolean(),
  bullets: z.array(z.string().trim().min(1).max(120)).max(12),
});

/** PATCH /api/admin/plans/:id — edit price, limits and features (audited). */
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiAdmin();
  const id = z.string().trim().min(1).max(40).parse((await params).id);
  const input = await parseJson(req, schema);
  const admin = createAdminClient();

  const { data: before } = await admin.from("subscription_plans").select("*").eq("id", id).maybeSingle();
  if (!before) throw new AppError("NOT_FOUND", "Plan not found.");

  const isFree = id === "free";
  const priceMonthly = isFree ? 0 : Math.round(input.priceMonthlyNaira * 100);
  const priceAnnual = isFree ? 0 : Math.round(input.priceAnnualNaira * 100);
  if (!isFree && (priceMonthly <= 0 || priceAnnual <= 0)) {
    throw new AppError("VALIDATION_ERROR", "Paid plans need monthly and annual prices above zero.");
  }

  const { error } = await admin
    .from("subscription_plans")
    .update({
      name: input.name,
      description: input.description,
      price_monthly: priceMonthly,
      price_annual: priceAnnual,
      features: input.features,
      limits: input.limits as unknown as Json,
      is_active: isFree ? true : input.isActive,
      highlighted: input.highlighted,
      price_is_starting_from: input.startingFrom,
      marketing_bullets: input.bullets,
    })
    .eq("id", id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not save the plan.");

  await audit({
    userId: ctx.userId,
    action: "admin.plan_updated",
    entityType: "subscription_plan",
    entityId: id,
    metadata: {
      before: { price_monthly: before.price_monthly, price_annual: before.price_annual, limits: before.limits, features: before.features, is_active: before.is_active },
      after: { price_monthly: priceMonthly, price_annual: priceAnnual, limits: input.limits as unknown as Json, features: input.features, is_active: input.isActive },
    },
    ip: clientIp(req.headers),
  });
  return { saved: true };
});
