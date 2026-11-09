import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { clientIp } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/services/audit";
import { notify } from "@/services/notifications";

const DAY = 86_400_000;
const reason = z.string().trim().min(5, "Give a reason of at least 5 characters.").max(500);
const days = z.coerce.number().int().min(1).max(366);

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("extend"), days, reason }),
  z.object({
    action: z.literal("set_plan"),
    planId: z.string().trim().min(1).max(40),
    interval: z.enum(["monthly", "annual"]).default("monthly"),
    days: days.default(30),
    reason,
  }),
]);

/** POST /api/admin/subscriptions/:userId — manual support adjustments (audited, no charge). */
export const POST = route<{ params: Promise<{ userId: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiAdmin();
  const userId = z.string().uuid().parse((await params).userId);
  const input = await parseJson(req, schema);
  const admin = createAdminClient();

  const { data: sub } = await admin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  if (!sub) throw new AppError("NOT_FOUND", "Subscription not found.");
  const before = { plan_id: sub.plan_id, status: sub.status, current_period_end: sub.current_period_end };
  const now = Date.now();

  if (input.action === "extend") {
    if (sub.plan_id === "free") throw new AppError("CONFLICT", "Free plans have no billing period to extend. Use 'Set plan'.");
    const base = Math.max(now, sub.current_period_end ? new Date(sub.current_period_end).getTime() : now);
    await admin
      .from("subscriptions")
      .update({ current_period_end: new Date(base + input.days * DAY).toISOString(), status: sub.status === "expired" || sub.status === "past_due" ? "active" : sub.status, renewal_attempts: 0 })
      .eq("id", sub.id);
  } else {
    const { data: plan } = await admin.from("subscription_plans").select("id").eq("id", input.planId).maybeSingle();
    if (!plan) throw new AppError("NOT_FOUND", "Plan not found.");
    const isFree = input.planId === "free";
    await admin
      .from("subscriptions")
      .update({
        plan_id: input.planId,
        billing_interval: input.interval,
        status: "active",
        current_period_start: new Date(now).toISOString(),
        current_period_end: isFree ? null : new Date(now + input.days * DAY).toISOString(),
        cancel_at_period_end: !isFree, // manual grants don't auto-charge
        pending_plan_id: null,
        pending_billing_interval: null,
        renewal_attempts: 0,
      })
      .eq("id", sub.id);
  }

  await audit({
    userId: ctx.userId,
    action: `admin.subscription_${input.action}`,
    entityType: "subscription",
    entityId: sub.id,
    metadata: { target_user: userId, reason: input.reason, before, request: { ...input, reason: null } },
    ip: clientIp(req.headers),
  });
  await notify({
    userId,
    category: "subscription",
    title: "Your subscription was updated",
    body: "Our team updated your plan. See the billing page for details.",
    link: "/dashboard/billing",
  });
  return { updated: true };
});
