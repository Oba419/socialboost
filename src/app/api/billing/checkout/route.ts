import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { startCheckout } from "@/services/billing";

const schema = z.object({
  planId: z.string().trim().min(1).max(40),
  interval: z.enum(["monthly", "annual"]),
});

/** POST /api/billing/checkout — returns the gateway URL to redirect to. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  await rateLimit("checkout", ctx.userId);
  const input = await parseJson(req, schema);
  return startCheckout({ userId: ctx.userId, email: ctx.email, planId: input.planId, interval: input.interval });
});
