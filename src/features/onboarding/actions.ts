"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { runAIService } from "@/lib/ai/runner";
import { growthAssessmentService } from "@/lib/ai/services/growth-assessment";
import { safePlan } from "@/features/auth/redirect";
import { stepSchemas, type OnboardingStep } from "./schemas";
import { TOTAL_STEPS } from "./options";
import type { OrganizationRow } from "@/types/database";

const stepNumber = z.coerce.number().int().min(1).max(6);

/** Persist one onboarding step server-side so the user can resume later. */
export async function saveOnboardingStep(step: number, values: unknown) {
  return action(async () => {
    const s = stepNumber.parse(step) as OnboardingStep;
    const ctx = await requireApiUser();
    const supabase = await createClient();
    const orgId = ctx.organization.id;

    const updateOrg = async (patch: Partial<OrganizationRow>) => {
      if (ctx.role !== "owner" && ctx.role !== "admin") {
        throw new AppError("FORBIDDEN", "Only workspace owners can update the brand profile.");
      }
      const { error } = await supabase.from("organizations").update(patch).eq("id", orgId);
      if (error) throw new AppError("INTERNAL_ERROR", "Could not save your answers. Please try again.");
    };

    switch (s) {
      case 1: {
        const v = stepSchemas[1].parse(values);
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: v.fullName, timezone: v.timezone })
          .eq("id", ctx.userId);
        if (error) throw new AppError("INTERNAL_ERROR", "Could not save your profile.");
        break;
      }
      case 2:
        await updateOrg({ user_type: stepSchemas[2].parse(values).userType });
        break;
      case 3:
        await updateOrg({ niche: stepSchemas[3].parse(values).niche });
        break;
      case 4:
        await updateOrg({ platforms: stepSchemas[4].parse(values).platforms });
        break;
      case 5:
        await updateOrg({ goals: stepSchemas[5].parse(values).goals });
        break;
      case 6: {
        const v = stepSchemas[6].parse(values);
        const followers: Record<string, number> = {};
        for (const [platform, raw] of Object.entries(v.followers)) {
          if (isPlatformId(platform) && raw !== "") followers[platform] = Number(raw);
        }
        await updateOrg({
          current_followers: followers,
          posting_frequency: v.postingFrequency,
          target_audience: v.targetAudience,
          location: v.location || null,
          brand_voice: v.brandVoice || null,
          content_resources: v.contentResources || null,
          preferred_formats: v.preferredFormats,
        });
        break;
      }
    }

    const nextStep = Math.min(TOTAL_STEPS, Math.max(ctx.profile.onboarding_step, s + 1));
    await supabase.from("profiles").update({ onboarding_step: nextStep }).eq("id", ctx.userId);
    return { step: nextStep };
  });
}

/** Step 7: AI growth assessment (1 credit). */
export async function generateGrowthAssessment() {
  return action(async () => {
    const ctx = await requireApiUser();
    const followers: Record<string, number> = {};
    for (const [p, n] of Object.entries(ctx.organization.current_followers ?? {})) {
      if (isPlatformId(p) && typeof n === "number") followers[PLATFORMS[p].name] = n;
    }
    const result = await runAIService(growthAssessmentService, ctx, { followers }, { save: true });
    return result;
  });
}

export async function completeOnboarding(plan?: string) {
  return action(async () => {
    const ctx = await requireApiUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true, onboarding_step: TOTAL_STEPS })
      .eq("id", ctx.userId);
    if (error) throw new AppError("INTERNAL_ERROR", "Could not finish onboarding. Please try again.");
    revalidatePath("/dashboard", "layout");
    const p = safePlan(plan);
    return { redirectTo: p ? `/dashboard/billing?plan=${p}` : "/dashboard" };
  });
}
