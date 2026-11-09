import { z } from "zod";
import { MANUAL_METRIC_KEYS } from "./metrics";
import { platformIdSchema } from "@/lib/validation/content";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const analyticsQuerySchema = z
  .object({
    from: dateStr,
    to: dateStr,
    platform: platformIdSchema.optional(),
    accountId: z.string().uuid().optional(),
  })
  .refine((v) => v.from <= v.to, { message: "Start date must be before end date." })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 <= 366, { message: "Range can be at most 1 year." });

export const manualMetricsSchema = z.object({
  platform: platformIdSchema,
  socialAccountId: z.string().uuid().nullable().optional(),
  date: dateStr.refine((d) => d <= new Date().toISOString().slice(0, 10), "Date can't be in the future."),
  source: z.enum(["manual", "import"]).default("manual"),
  metrics: z
    .record(z.enum(MANUAL_METRIC_KEYS), z.coerce.number().min(0, "Values can't be negative.").max(1e12))
    .refine((m) => Object.keys(m).length > 0, "Enter at least one metric."),
});
