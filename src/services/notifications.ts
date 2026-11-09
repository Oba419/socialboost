import "server-only";
import { isEmailConfigured, isServiceRoleConfigured, serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { siteConfig } from "@/config/site";
import type { NotificationCategory, NotificationSettings } from "@/types/database";

/**
 * Creates an in-app notification (respecting the user's preferences) and, when
 * an email provider is configured and the user opted in, sends an email.
 * Never throws: notification failures must not break the calling flow.
 */
export async function notify(n: {
  userId: string;
  organizationId?: string | null;
  category: NotificationCategory;
  title: string;
  body?: string;
  link?: string;
  /** Skip if an identical notification was sent within this many hours. */
  dedupeHours?: number;
}): Promise<void> {
  try {
    if (!isServiceRoleConfigured()) return;
    const admin = createAdminClient();

    const { data: prefs } = await admin
      .from("user_preferences")
      .select("notification_settings")
      .eq("user_id", n.userId)
      .maybeSingle();
    const settings = prefs?.notification_settings as NotificationSettings | undefined;
    const inApp = settings?.in_app?.[n.category] ?? true;
    const email = settings?.email?.[n.category] ?? false;

    if (n.dedupeHours) {
      const since = new Date(Date.now() - n.dedupeHours * 3_600_000).toISOString();
      const { count } = await admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", n.userId)
        .eq("type", n.category)
        .eq("title", n.title)
        .gte("created_at", since);
      if ((count ?? 0) > 0) return;
    }

    if (inApp) {
      await admin.from("notifications").insert({
        user_id: n.userId,
        organization_id: n.organizationId ?? null,
        type: n.category,
        title: n.title,
        body: n.body ?? "",
        link: n.link ?? null,
      });
    }

    if (email && isEmailConfigured()) {
      const { data: profile } = await admin.from("profiles").select("email").eq("id", n.userId).single();
      if (profile?.email) {
        await sendEmail({
          to: profile.email,
          subject: `${n.title} · ${siteConfig.name}`,
          text: `${n.body ?? ""}\n\n${n.link ? `${siteConfig.url}${n.link}` : ""}`.trim(),
        });
      }
    }
  } catch (error) {
    logger.error("notify failed", error);
  }
}

/** Sends a plain-text email via Resend's REST API. Returns false when not configured. */
export async function sendEmail(msg: { to: string; subject: string; text: string; replyTo?: string }): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const env = serverEnv();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      reply_to: msg.replyTo,
    }),
  });
  if (!res.ok) {
    logger.error("Email send failed", { status: res.status });
    return false;
  }
  return true;
}
