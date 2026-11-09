import "server-only";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { AuthContext } from "@/lib/auth/session";
import { assertLimit } from "@/lib/entitlements";

/**
 * Saved items = saved generations + saved ideas + posts (drafts/scheduled).
 * Counted per workspace against the plan's `savedItems` limit.
 */
export async function countSavedItems(supabase: ServerSupabaseClient, organizationId: string): Promise<number> {
  const [gen, ideas, posts] = await Promise.all([
    supabase.from("generated_content").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("is_saved", true),
    supabase.from("content_ideas").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("social_posts").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).neq("status", "archived"),
  ]);
  return (gen.count ?? 0) + (ideas.count ?? 0) + (posts.count ?? 0);
}

export async function assertCanSave(supabase: ServerSupabaseClient, ctx: AuthContext, increment = 1) {
  const count = await countSavedItems(supabase, ctx.organization.id);
  await assertLimit(ctx, "savedItems", count, increment);
}
