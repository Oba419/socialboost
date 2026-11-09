import { z } from "zod";
import { assertSameOrigin, parseJson, parseQuery, route } from "@/lib/api/handler";
import { paginate } from "@/lib/api/response";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { saveIdeasSchema } from "@/lib/validation/content";
import { assertCanSave } from "@/services/content";

const listQuery = z.object({
  status: z.enum(["saved", "used", "archived"]).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export const GET = route(async (req) => {
  const ctx = await requireApiUser();
  const q = parseQuery(req, listQuery);
  const supabase = await createClient();
  let query = supabase
    .from("content_ideas")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .range((q.page - 1) * q.pageSize, q.page * q.pageSize - 1);
  if (q.status) query = query.eq("status", q.status);
  if (q.search) query = query.ilike("title", `%${q.search.replace(/[%_]/g, "")}%`);
  const { data, count, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load ideas.");
  return paginate(data ?? [], q.page, q.pageSize, count ?? 0);
});

/** POST /api/ideas — save one or more generated ideas. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const input = await parseJson(req, saveIdeasSchema);
  const supabase = await createClient();
  await assertCanSave(supabase, ctx, input.ideas.length);

  const { data, error } = await supabase
    .from("content_ideas")
    .insert(
      input.ideas.map((idea) => ({
        organization_id: ctx.organization.id,
        created_by: ctx.userId,
        generated_content_id: input.generatedContentId ?? null,
        title: idea.title,
        description: idea.description,
        target_audience: idea.targetAudience ?? null,
        platform: idea.platform ?? null,
        format: idea.format ?? null,
        hook: idea.hook ?? null,
        cta: idea.cta ?? null,
        hashtags: idea.hashtags,
        rationale: idea.rationale ?? null,
      })),
    )
    .select("*");
  if (error) throw new AppError("INTERNAL_ERROR", "Could not save ideas.");
  return data;
});
