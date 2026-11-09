import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { OrganizationRow, OrgRole, ProfileRow } from "@/types/database";

/**
 * Data Access Layer for authentication. All server-side authorization goes
 * through these helpers. They are memoised per request with React `cache`.
 */

export interface AuthContext {
  userId: string;
  email: string;
  profile: ProfileRow;
  organization: OrganizationRow;
  role: OrgRole;
  /** The user whose subscription pays for this workspace (the org owner). */
  billingUserId: string;
}

/** Returns the verified auth user or null. Never trusts unverified cookies. */
export const getAuthUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

/** Loads profile + active workspace. Returns null when signed out. */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return null;

  // Resolve active workspace: current_organization_id, else first membership.
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!memberships?.length) return null;
  const membership =
    memberships.find((m) => m.organization_id === profile.current_organization_id) ?? memberships[0];

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();
  if (!organization) return null;

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile,
    organization,
    role: membership.role,
    billingUserId: organization.owner_id,
  };
});

/** For pages: redirect to login when signed out, to /suspended when suspended. */
export async function requireUser(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.profile.status === "suspended") redirect("/auth/error?reason=suspended");
  return ctx;
}

/** For pages that need onboarding complete. */
export async function requireOnboardedUser(): Promise<AuthContext> {
  const ctx = await requireUser();
  if (!ctx.profile.onboarding_completed) redirect("/onboarding");
  return ctx;
}

/** For API routes / server actions: throws AppError instead of redirecting. */
export async function requireApiUser(): Promise<AuthContext> {
  if (!isSupabaseConfigured()) throw new AppError("NOT_CONFIGURED", "Supabase is not configured.");
  const ctx = await getAuthContext();
  if (!ctx) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  if (ctx.profile.status === "suspended") throw new AppError("ACCOUNT_SUSPENDED", "This account is suspended.");
  return ctx;
}

export function assertCanEdit(ctx: AuthContext) {
  if (ctx.role === "viewer") throw new AppError("FORBIDDEN", "You have view-only access to this workspace.");
}

export function assertCanManage(ctx: AuthContext) {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new AppError("FORBIDDEN", "Only workspace owners and admins can do this.");
  }
}

/** Platform administrator check (profiles.role = 'admin'; set via SQL only). */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireUser();
  if (ctx.profile.role !== "admin") redirect("/dashboard");
  return ctx;
}

export async function requireApiAdmin(): Promise<AuthContext> {
  const ctx = await requireApiUser();
  if (ctx.profile.role !== "admin") throw new AppError("FORBIDDEN", "Administrator access required.");
  return ctx;
}
