import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { runAIService } from "@/lib/ai/runner";
import { performanceReviewService } from "@/lib/ai/services/performance-review";

export const maxDuration = 120;

/** POST /api/analytics/review — AI performance review grounded in real stored metrics. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  const body = await parseJson(req, z.object({ periodDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(7) }));
  return runAIService(performanceReviewService, ctx, { periodDays: body.periodDays }, { withPerformance: true, save: false });
});
