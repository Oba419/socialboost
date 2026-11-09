"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isGoogleAuthEnabled, isSupabaseConfigured, publicEnv } from "@/lib/env";
import { action } from "@/lib/api/handler";
import { AppError } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/services/audit";
import {
  changePasswordSchema,
  emailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";
import { safeNext, safePlan } from "./redirect";

async function ip() {
  return clientIp(await headers());
}

function appUrl() {
  return publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

function requireConfigured() {
  if (!isSupabaseConfigured()) throw new AppError("NOT_CONFIGURED", "Authentication is not configured yet.");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function signIn(values: unknown) {
  return action(async () => {
    requireConfigured();
    const input = signInSchema.parse(values);
    const addr = await ip();
    await rateLimit("auth", `signin:${addr}`);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error || !data.user) {
      if (error?.code === "email_not_confirmed") {
        throw new AppError("FORBIDDEN", "Please verify your email address first. Check your inbox for the link.", {
          needsVerification: true,
        });
      }
      throw new AppError("UNAUTHENTICATED", "Invalid email or password.");
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, status")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.status === "suspended") {
      await supabase.auth.signOut();
      throw new AppError("ACCOUNT_SUSPENDED", "This account is suspended. Contact support for help.");
    }
    await audit({ userId: data.user.id, action: "auth.sign_in", ip: addr });
    const redirectTo = profile && !profile.onboarding_completed ? "/onboarding" : safeNext(input.next);
    return { redirectTo };
  });
}

export async function signUp(values: unknown) {
  return action(async () => {
    requireConfigured();
    const input = signUpSchema.parse(values);
    const addr = await ip();
    await rateLimit("auth", `signup:${addr}`);
    const plan = safePlan(input.plan);
    const next = plan ? `/onboarding?plan=${plan}` : "/onboarding";
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName },
        emailRedirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      if (error.code === "weak_password") throw new AppError("VALIDATION_ERROR", error.message);
      if (error.code === "over_email_send_rate_limit") {
        throw new AppError("RATE_LIMITED", "Too many emails sent. Please wait a few minutes and try again.");
      }
      // Don't reveal whether the address is already registered.
      if (error.code !== "user_already_exists") throw new AppError("PROVIDER_ERROR", "We couldn't create your account. Please try again.");
    }
    if (data.session) return { redirectTo: next };
    return { redirectTo: `/verify-email?email=${encodeURIComponent(input.email)}` };
  });
}

export async function signInWithGoogle(nextParam?: string) {
  return action(async () => {
    requireConfigured();
    if (!isGoogleAuthEnabled()) throw new AppError("NOT_CONFIGURED", "Google sign-in is not enabled.");
    await rateLimit("auth", `google:${await ip()}`);
    const supabase = await createClient();
    const next = safeNext(nextParam);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error || !data.url) throw new AppError("PROVIDER_ERROR", "Google sign-in is unavailable right now.");
    return { url: data.url };
  });
}

export async function requestPasswordReset(values: unknown) {
  return action(async () => {
    requireConfigured();
    const input = forgotPasswordSchema.parse(values);
    await rateLimit("auth", `reset:${await ip()}`);
    const supabase = await createClient();
    // Result intentionally ignored: never reveal whether the email exists.
    await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
    });
    return { sent: true };
  });
}

export async function updatePassword(values: unknown) {
  return action(async () => {
    requireConfigured();
    const input = resetPasswordSchema.parse(values);
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new AppError("UNAUTHENTICATED", "Your reset link has expired. Request a new one.");
    await rateLimit("auth", `update:${userData.user.id}`);
    const { error } = await supabase.auth.updateUser({ password: input.password });
    if (error) {
      throw new AppError(
        "VALIDATION_ERROR",
        error.code === "same_password" ? "Choose a password you haven't used before." : "Couldn't update your password.",
      );
    }
    await audit({ userId: userData.user.id, action: "auth.password_changed", ip: await ip() });
    return { redirectTo: "/dashboard" };
  });
}

/** Change password from settings: re-verifies the current password first. */
export async function changePassword(values: unknown) {
  return action(async () => {
    requireConfigured();
    const input = changePasswordSchema.parse(values);
    const current = input.currentPassword;
    const next = input.password;
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!userData.user || !email) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
    await rateLimit("auth", `change:${userData.user.id}`);
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (verifyError) throw new AppError("VALIDATION_ERROR", "Your current password is incorrect.");
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) throw new AppError("VALIDATION_ERROR", "Couldn't update your password.");
    await audit({ userId: userData.user.id, action: "auth.password_changed", ip: await ip() });
    return { changed: true };
  });
}

export async function resendVerification(emailValue: unknown) {
  return action(async () => {
    requireConfigured();
    const email = emailSchema.parse(emailValue);
    await rateLimit("auth", `resend:${await ip()}`);
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${appUrl()}/auth/callback?next=/onboarding` },
    });
    if (error?.code === "over_email_send_rate_limit") {
      throw new AppError("RATE_LIMITED", "Please wait a minute before requesting another email.");
    }
    return { sent: true };
  });
}
