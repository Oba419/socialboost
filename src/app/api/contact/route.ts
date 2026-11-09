import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { getAuthUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { isEmailConfigured, isServiceRoleConfigured, serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/services/notifications";
import { contactSchema } from "@/features/contact/schema";

/**
 * POST /api/contact — stores the message (support inbox in the admin console)
 * and/or forwards it by email. Fails loudly if neither destination exists.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  await rateLimit("contact", clientIp(req.headers));

  // Accept a filled honeypot at parse time so bots get a normal-looking response.
  const raw = await parseJson(req, contactSchema.extend({ website: z.string().max(500).optional() }));
  // Honeypot filled → silently accept without storing (don't tip off bots).
  if (raw.website) return { received: true };
  const input = raw;

  const canStore = isServiceRoleConfigured();
  const inbox = serverEnv().CONTACT_INBOX_EMAIL;
  const canEmail = isEmailConfigured() && Boolean(inbox);
  if (!canStore && !canEmail) {
    throw new AppError("NOT_CONFIGURED", "The contact form isn't set up yet. Please email us directly instead.");
  }

  const user = await getAuthUser().catch(() => null);
  let stored = false;
  let emailed = false;

  if (canStore) {
    const { error } = await createAdminClient()
      .from("contact_messages")
      .insert({
        user_id: user?.id ?? null,
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
      });
    if (error) logger.error("Failed to store contact message", error.message);
    else stored = true;
  }

  if (canEmail && inbox) {
    emailed = await sendEmail({
      to: inbox,
      replyTo: input.email,
      subject: `[Contact] ${input.subject}`,
      text: `From: ${input.name} <${input.email}>${user ? ` (user ${user.id})` : ""}\n\n${input.message}`,
    });
  }

  if (!stored && !emailed) {
    throw new AppError("INTERNAL_ERROR", "We couldn't send your message right now. Please try again later.");
  }
  return { received: true };
});
