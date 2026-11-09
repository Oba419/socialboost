"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/lib/api/handler";
import { assertCanManage, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import { assertFeature, assertLimit, getEntitlements, hasFeature, isWithinLimit } from "@/lib/entitlements";
import { FEATURE_LABELS } from "@/config/plans";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/services/audit";
import { notify } from "@/services/notifications";
import type { NotificationSettings } from "@/types/database";
import {
  addMemberSchema,
  brandSchema,
  createWorkspaceSchema,
  memberRoleSchema,
  notificationSettingsSchema,
  profileSchema,
  themeSchema,
} from "./schemas";

const ip = async () => clientIp(await headers());

export async function updateProfile(values: unknown) {
  return action(async () => {
    const ctx = await requireApiUser();
    const v = profileSchema.parse(values);
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: v.fullName, avatar_url: v.avatarUrl || null, timezone: v.timezone })
      .eq("id", ctx.userId);
    if (error) throw new AppError("INTERNAL_ERROR", "Could not save your profile.");
    revalidatePath("/dashboard", "layout");
    return { saved: true };
  });
}

export async function updateBrandProfile(values: unknown) {
  return action(async () => {
    const ctx = await requireApiUser();
    assertCanManage(ctx);
    const v = brandSchema.parse(values);
    const supabase = await createClient();
    const { error } = await supabase
      .from("organizations")
      .update({
        name: v.name,
        user_type: v.userType,
        niche: v.niche || null,
        target_audience: v.targetAudience || null,
        location: v.location || null,
        brand_voice: v.brandVoice || null,
        platforms: v.platforms,
        goals: v.goals,
        posting_frequency: v.postingFrequency || null,
        content_resources: v.contentResources || null,
        preferred_formats: v.preferredFormats,
      })
      .eq("id", ctx.organization.id);
    if (error) throw new AppError("INTERNAL_ERROR", "Could not save the brand profile.");
    revalidatePath("/dashboard", "layout");
    return { saved: true };
  });
}

export async function updateTheme(theme: unknown) {
  return action(async () => {
    const ctx = await requireApiUser();
    const t = themeSchema.parse(theme);
    const supabase = await createClient();
    const { error } = await supabase.from("user_preferences").update({ theme: t }).eq("user_id", ctx.userId);
    if (error) throw new AppError("INTERNAL_ERROR", "Could not save your theme.");
    return { theme: t };
  });
}

export async function updateNotificationSettings(values: unknown) {
  return action(async () => {
    const ctx = await requireApiUser();
    const v = notificationSettingsSchema.parse(values);
    const supabase = await createClient();
    const { error } = await supabase
      .from("user_preferences")
      .update({ notification_settings: v as unknown as NotificationSettings })
      .eq("user_id", ctx.userId);
    if (error) throw new AppError("INTERNAL_ERROR", "Could not save notification preferences.");
    return { saved: true };
  });
}

/** Create a brand (multi_brand) or client (client_workspaces) workspace owned by the current user. */
export async function createWorkspace(values: unknown) {
  return action(async () => {
    const ctx = await requireApiUser();
    const v = createWorkspaceSchema.parse(values);
    await rateLimit("write", ctx.userId);
    // New workspaces are billed to the user creating them.
    const ent = await getEntitlements(ctx.userId);
    const feature = v.type === "client" ? "client_workspaces" : "multi_brand";
    if (!hasFeature(ent.plan, feature)) {
      throw new AppError("PLAN_REQUIRED", `${FEATURE_LABELS[feature]} aren't included in your ${ent.plan.name} plan.`, { feature });
    }
    const admin = createAdminClient();
    const { count } = await admin.from("organizations").select("id", { count: "exact", head: true }).eq("owner_id", ctx.userId);
    if (!isWithinLimit(ent.plan.limits.workspaces, count ?? 0)) {
      throw new AppError("QUOTA_EXCEEDED", `Your ${ent.plan.name} plan allows ${ent.plan.limits.workspaces} workspaces.`, {
        limit: "workspaces",
      });
    }

    let parentId: string | null = null;
    if (v.type === "client") {
      const { data: personal } = await admin
        .from("organizations")
        .select("id")
        .eq("owner_id", ctx.userId)
        .eq("type", "personal")
        .limit(1)
        .maybeSingle();
      parentId = personal?.id ?? null;
    }

    const { data: org, error } = await admin
      .from("organizations")
      .insert({ name: v.name, type: v.type, owner_id: ctx.userId, parent_organization_id: parentId })
      .select("id, name, type")
      .single();
    if (error || !org) throw new AppError("INTERNAL_ERROR", "Could not create the workspace.");
    const { error: memberError } = await admin
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: ctx.userId, role: "owner" });
    if (memberError) {
      await admin.from("organizations").delete().eq("id", org.id);
      throw new AppError("INTERNAL_ERROR", "Could not create the workspace.");
    }
    await audit({ userId: ctx.userId, organizationId: org.id, action: "workspace.created", entityType: "organization", entityId: org.id, metadata: { type: v.type }, ip: await ip() });
    revalidatePath("/dashboard", "layout");
    return org;
  });
}

export async function deleteWorkspace(organizationId: unknown) {
  return action(async () => {
    const ctx = await requireApiUser();
    const id = z.string().uuid().parse(organizationId);
    const admin = createAdminClient();
    const { data: org } = await admin.from("organizations").select("id, owner_id, type, name").eq("id", id).maybeSingle();
    if (!org || org.owner_id !== ctx.userId) throw new AppError("FORBIDDEN", "Only the workspace owner can delete it.");
    if (org.type === "personal") throw new AppError("CONFLICT", "Your personal workspace can't be deleted. Delete your account instead.");

    // Remove stored media first (DB rows cascade, storage objects don't).
    const { data: media } = await admin.from("media_assets").select("storage_path").eq("organization_id", id);
    if (media?.length) await admin.storage.from("media").remove(media.map((m) => m.storage_path));

    await audit({ userId: ctx.userId, organizationId: null, action: "workspace.deleted", entityType: "organization", entityId: id, metadata: { name: org.name }, ip: await ip() });
    const { error } = await admin.from("organizations").delete().eq("id", id);
    if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the workspace.");
    revalidatePath("/dashboard", "layout");
    return { deleted: true };
  });
}

/** Add an existing user (by email) to the current workspace. */
export async function addTeamMember(values: unknown) {
  return action(async () => {
    const ctx = await requireApiUser();
    assertCanManage(ctx);
    const v = addMemberSchema.parse(values);
    await rateLimit("write", ctx.userId);
    await assertFeature(ctx, "team_members");

    const admin = createAdminClient();
    const { count } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organization.id);
    await assertLimit(ctx, "teamMembers", count ?? 0);

    const { data: target } = await admin.from("profiles").select("id, status").eq("email", v.email).maybeSingle();
    if (!target || target.status !== "active") {
      throw new AppError("NOT_FOUND", "No active account uses that email. Ask them to sign up first, then add them again.");
    }
    const { error } = await admin
      .from("organization_members")
      .insert({ organization_id: ctx.organization.id, user_id: target.id, role: v.role });
    if (error) {
      if (error.code === "23505") throw new AppError("CONFLICT", "That person is already a member of this workspace.");
      throw new AppError("INTERNAL_ERROR", "Could not add the team member.");
    }
    await audit({ userId: ctx.userId, organizationId: ctx.organization.id, action: "team.member_added", entityType: "user", entityId: target.id, metadata: { role: v.role }, ip: await ip() });
    await notify({
      userId: target.id,
      organizationId: ctx.organization.id,
      category: "integrations",
      title: `You were added to ${ctx.organization.name}`,
      body: `You now have ${v.role} access. Switch workspaces from the top bar.`,
      link: "/dashboard",
    });
    revalidatePath("/dashboard/settings");
    return { added: true };
  });
}

async function loadMember(memberId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organization_members")
    .select("id, user_id, role, organization_id")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!data) throw new AppError("NOT_FOUND", "Member not found.");
  return data;
}

export async function updateMemberRole(memberId: unknown, role: unknown) {
  return action(async () => {
    const ctx = await requireApiUser();
    assertCanManage(ctx);
    const id = z.string().uuid().parse(memberId);
    const r = memberRoleSchema.parse(role);
    const member = await loadMember(id, ctx.organization.id);
    if (member.role === "owner") throw new AppError("CONFLICT", "The owner's role can't be changed.");
    if (member.user_id === ctx.userId) throw new AppError("CONFLICT", "You can't change your own role.");
    const { error } = await createAdminClient().from("organization_members").update({ role: r }).eq("id", id);
    if (error) throw new AppError("INTERNAL_ERROR", "Could not update the role.");
    await audit({ userId: ctx.userId, organizationId: ctx.organization.id, action: "team.role_changed", entityType: "user", entityId: member.user_id, metadata: { from: member.role, to: r }, ip: await ip() });
    revalidatePath("/dashboard/settings");
    return { role: r };
  });
}

/** Remove a member (managers) or leave the workspace (self). */
export async function removeMember(memberId: unknown) {
  return action(async () => {
    const ctx = await requireApiUser();
    const id = z.string().uuid().parse(memberId);
    const member = await loadMember(id, ctx.organization.id);
    const self = member.user_id === ctx.userId;
    if (!self) assertCanManage(ctx);
    if (member.role === "owner") throw new AppError("CONFLICT", "The workspace owner can't be removed.");
    const admin = createAdminClient();
    const { error } = await admin.from("organization_members").delete().eq("id", id);
    if (error) throw new AppError("INTERNAL_ERROR", "Could not remove the member.");
    await admin
      .from("profiles")
      .update({ current_organization_id: null })
      .eq("id", member.user_id)
      .eq("current_organization_id", ctx.organization.id);
    await audit({ userId: ctx.userId, organizationId: ctx.organization.id, action: self ? "team.left" : "team.member_removed", entityType: "user", entityId: member.user_id, ip: await ip() });
    revalidatePath("/dashboard", "layout");
    return { removed: true, left: self };
  });
}
