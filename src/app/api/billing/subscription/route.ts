import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { isServiceRoleConfigured } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { cancelAtPeriodEnd, clearPendingChange, resumeSubscription, scheduleDowngrade } from "@/services/billing";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("clear_pending") }),
  z.object({
    action: z.literal("downgrade"),
    planId: z.string().trim().min(1).max(40),
    interval: z.enum(["monthly", "annual"]).default("monthly"),
  }),
]);

/** POST /api/billing/subscription — cancel / resume / schedule downgrade. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  if (!isServiceRoleConfigured()) throw new AppError("NOT_CONFIGURED", "Billing is not configured.");
  await rateLimit("write", ctx.userId);
  const input = await parseJson(req, schema);
  switch (input.action) {
    case "cancel":
      await cancelAtPeriodEnd(ctx.userId);
      break;
    case "resume":
      await resumeSubscription(ctx.userId);
      break;
    case "clear_pending":
      await clearPendingChange(ctx.userId);
      break;
    case "downgrade":
      await scheduleDowngrade(ctx.userId, input.planId, input.interval);
      break;
  }
  return { ok: true };
});
