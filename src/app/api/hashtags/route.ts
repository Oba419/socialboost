import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";

const tagSchema = z
  .string()
  .trim()
  .transform((t) => t.replace(/^#+/, ""))
  .pipe(z.string().regex(/^[\p{L}\p{N}_]{1,100}$/u, "Hashtags may only contain letters, numbers and underscores."));

const saveSchema = z.object({
  tags: z.array(tagSchema).min(1, "Select at least one hashtag.").max(50),
  category: z.string().trim().max(40).nullable().optional(),
  topic: z.string().trim().max(200).nullable().optional(),
});

/** GET /api/hashtags — saved hashtags for the workspace. */
export const GET = route(async () => {
  const ctx = await requireApiUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_hashtags")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load saved hashtags.");
  return data ?? [];
});

/** POST /api/hashtags — save (upsert) hashtags. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  await rateLimit("write", ctx.userId);
  const input = await parseJson(req, saveSchema);
  const supabase = await createClient();
  const unique = [...new Set(input.tags.map((t) => t.toLowerCase()))];
  const { data, error } = await supabase
    .from("saved_hashtags")
    .upsert(
      unique.map((tag) => ({
        organization_id: ctx.organization.id,
        created_by: ctx.userId,
        tag,
        category: input.category ?? null,
        topic: input.topic ?? null,
      })),
      { onConflict: "organization_id,tag", ignoreDuplicates: true },
    )
    .select("*");
  if (error) throw new AppError("INTERNAL_ERROR", "Could not save hashtags.");
  return { saved: data?.length ?? 0 };
});
