import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { DIRECT_AI_SERVICES, isDirectAIService } from "@/lib/ai/registry";
import { runAIService } from "@/lib/ai/runner";
import type { AIServiceDefinition } from "@/lib/ai/types";

export const maxDuration = 300;

const bodySchema = z.object({
  input: z.unknown(),
  save: z.boolean().optional(),
});

/** POST /api/ai/:service — run a direct AI service for the current workspace. */
export const POST = route<{ params: Promise<{ service: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const { service } = await params;
  if (!isDirectAIService(service)) throw new AppError("NOT_FOUND", "Unknown AI service.");

  const ctx = await requireApiUser();
  const body = await parseJson(req, bodySchema);
  // The registry is a heterogeneous union; widen it (input is validated by def.inputSchema).
  const def = DIRECT_AI_SERVICES[service] as unknown as AIServiceDefinition;

  // Each service has its own input schema; validation happens in the runner.
  const result = await runAIService(def, ctx, body.input, {
    save: body.save,
    withPerformance: service === "growth_coach",
  });
  return result;
});
