import { NextResponse } from "next/server";
import { isServiceRoleConfigured } from "@/lib/env";
import { getPaymentProvider } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Json } from "@/types/database";
import { fulfilPayment } from "@/services/billing";

/**
 * POST /api/webhooks/paystack
 * Signature is verified on the RAW body before anything is parsed. Events are
 * deduplicated through webhook_events (provider, event_key). After a valid
 * signature we always answer 200 so Paystack doesn't retry our own logic
 * errors; failures are recorded on the event row and logged.
 */
export async function POST(req: Request) {
  const provider = getPaymentProvider();
  if (!provider.isConfigured() || !isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const raw = await req.text();
  if (!provider.verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let event: { event?: string; data?: { id?: number | string; reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = event.event ?? "unknown";
  const reference = event.data?.reference ?? null;
  const eventKey = `${type}:${reference ?? event.data?.id ?? "none"}`;
  const admin = createAdminClient();

  await admin
    .from("webhook_events")
    .upsert({ provider: "paystack", event_key: eventKey, event_type: type, payload: event as unknown as Json }, { onConflict: "provider,event_key", ignoreDuplicates: true });
  const { data: row } = await admin
    .from("webhook_events")
    .select("id, processed_at")
    .eq("provider", "paystack")
    .eq("event_key", eventKey)
    .maybeSingle();
  if (row?.processed_at) return NextResponse.json({ ok: true, duplicate: true });

  let error: string | null = null;
  try {
    if (type === "charge.success" && reference) {
      const result = await fulfilPayment(reference);
      if (result === "not_found") error = "unknown_reference";
      else if (result === "pending") error = "verification_pending";
    }
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 500) : "processing_error";
    logger.error("Paystack webhook processing failed", { eventKey, error });
  }

  if (row) {
    await admin
      .from("webhook_events")
      .update({ processed_at: error === "verification_pending" ? null : new Date().toISOString(), error })
      .eq("id", row.id);
  }
  return NextResponse.json({ ok: true });
}
