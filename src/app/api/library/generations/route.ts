import { z } from "zod";
import { parseQuery, route } from "@/lib/api/handler";
import { paginate } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const query = z.object({
  search: z.string().trim().max(200).optional(),
  service: z.string().trim().max(40).optional(),
  platform: z.string().trim().max(40).optional(),
  scope: z.enum(["saved", "all"]).default("saved"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** GET /api/library/generations — saved AI generations (or full history) for the workspace. */
export const GET = route(async (req) => {
  const ctx = await requireApiUser();
  const q = parseQuery(req, query);
  const supabase = await createClient();

  let builder = supabase
    .from("generated_content")
    .select("id, service, platform, title, body_text, rating, is_saved, created_at, updated_at", { count: "exact" })
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .range((q.page - 1) * q.pageSize, q.page * q.pageSize - 1);
  if (q.scope === "saved") builder = builder.eq("is_saved", true);
  if (q.service) builder = builder.eq("service", q.service);
  if (q.platform) builder = builder.eq("platform", q.platform);
  if (q.search) builder = builder.textSearch("search", q.search, { type: "websearch", config: "simple" });

  const { data, count, error } = await builder;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load your generations.");
  return paginate(data ?? [], q.page, q.pageSize, count ?? 0);
});
