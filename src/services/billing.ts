import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";
import { isServiceRoleConfigured, publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";
import { logger } from "@/lib/logger";
import { effectivePlanId } from "@/lib/entitlements/core";
import { getPaymentProvider, PaymentProviderError, type VerifiedTransaction } from "@/lib/payments";
import {
  amountMatches,
  classifyChange,
  computeNewPeriod,
  newPaymentReference,
  priceFor,
  renewalAction,
} from "@/lib/payments/billing-math";
import { audit } from "@/services/audit";
import { notify } from "@/services/notifications";
import type { BillingInterval, PaymentRow, SubscriptionPlanRow, SubscriptionRow } from "@/types/database";

/**
 * Subscription billing.
 *
 * Invariants:
 *  - Paid access is granted ONLY in fulfilPayment(), after a server-side
 *    verification with the provider whose amount/currency match our record.
 *  - The plan/interval charged come from OUR payments row, never from
 *    client input or provider metadata.
 *  - fulfilPayment() is idempotent: the payment is claimed with a conditional
 *    update (status = 'pending') so concurrent webhook + callback can't
 *    extend a subscription twice.
 */

interface StoredAuthorization {
  code: string;
  email: string;
  last4: string | null;
  brand: string | null;
  exp: string | null;
  signature: string | null;
}

function requireBillingInfra() {
  if (!isServiceRoleConfigured()) {
    throw new AppError("NOT_CONFIGURED", "SUPABASE_SERVICE_ROLE_KEY is required for billing.");
  }
  const provider = getPaymentProvider();
  if (!provider.isConfigured()) {
    throw new AppError("NOT_CONFIGURED", "Payments are not configured yet (PAYSTACK_SECRET_KEY / NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY).");
  }
  return { admin: createAdminClient(), provider };
}

async function loadPlans() {
  const admin = createAdminClient();
  const { data } = await admin.from("subscription_plans").select("*").order("sort_order");
  const plans = data ?? [];
  const order = Object.fromEntries(plans.map((p) => [p.id, p.sort_order]));
  return { plans, order };
}

function isPaidAndActive(sub: SubscriptionRow | null): boolean {
  return effectivePlanId(sub) !== "free";
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const { data } = await createAdminClient().from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  return data ?? null;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export async function startCheckout(params: {
  userId: string;
  email: string;
  planId: string;
  interval: BillingInterval;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const { admin, provider } = requireBillingInfra();
  const { plans, order } = await loadPlans();
  const plan = plans.find((p) => p.id === params.planId);
  if (!plan || !plan.is_active) throw new AppError("NOT_FOUND", "That plan is not available.");
  const amount = priceFor(plan, params.interval);
  if (amount <= 0) throw new AppError("VALIDATION_ERROR", "The free plan doesn't need checkout.");

  const sub = await getSubscription(params.userId);
  const kind = classifyChange(
    { planId: sub?.plan_id ?? "free", interval: sub?.billing_interval ?? "monthly", isPaidAndActive: isPaidAndActive(sub) },
    { planId: plan.id, interval: params.interval },
    order,
  );
  if (kind === "same") throw new AppError("CONFLICT", "You're already on this plan.");
  if (kind === "downgrade") {
    throw new AppError("CONFLICT", "Downgrades take effect at the end of your billing period. Use 'Schedule downgrade' instead.");
  }

  const reference = newPaymentReference(randomUUID());
  const { error } = await admin.from("payments").insert({
    user_id: params.userId,
    subscription_id: sub?.id ?? null,
    provider: provider.id,
    reference,
    purpose: "subscription",
    plan_id: plan.id,
    billing_interval: params.interval,
    amount,
    currency: plan.currency,
    status: "pending",
  });
  if (error) {
    logger.error("Failed to create payment record", error.message);
    throw new AppError("INTERNAL_ERROR", "Could not start checkout. Please try again.");
  }

  try {
    const init = await provider.initializeTransaction({
      email: params.email,
      amount,
      currency: plan.currency,
      reference,
      callbackUrl: `${publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/billing/callback`,
      metadata: { user_id: params.userId, plan_id: plan.id, interval: params.interval, purpose: "subscription" },
    });
    await audit({
      userId: params.userId,
      action: "billing.checkout_started",
      entityType: "payment",
      entityId: reference,
      metadata: { plan_id: plan.id, interval: params.interval, amount, change: kind },
    });
    return { authorizationUrl: init.authorizationUrl, reference };
  } catch (e) {
    await admin.from("payments").update({ status: "failed", gateway_response: "initialize_failed" }).eq("reference", reference);
    logger.error("Paystack initialize failed", e instanceof Error ? e.message : e);
    throw new AppError("PROVIDER_ERROR", "The payment gateway is unavailable right now. Please try again shortly.");
  }
}

// ---------------------------------------------------------------------------
// Fulfilment (callback + webhook + renewals all converge here)
// ---------------------------------------------------------------------------

export type FulfilResult = "success" | "failed" | "pending" | "not_found";

export async function fulfilPayment(reference: string): Promise<FulfilResult> {
  const { admin, provider } = requireBillingInfra();

  const { data: payment } = await admin.from("payments").select("*").eq("reference", reference).maybeSingle();
  if (!payment) return "not_found";
  if (payment.status === "success") return "success";
  if (payment.status !== "pending") return "failed";

  let tx: VerifiedTransaction;
  try {
    // Always verify server-side, even when a charge response looked successful.
    tx = await provider.verifyTransaction(reference);
  } catch (e) {
    logger.warn("Payment verification unavailable", e instanceof PaymentProviderError ? e.message : "error");
    return "pending";
  }

  if (tx.status === "pending") return "pending";
  if (tx.status !== "success") {
    await admin
      .from("payments")
      .update({ status: tx.status === "abandoned" ? "abandoned" : "failed", gateway_response: tx.gatewayResponse, verified_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending");
    return "failed";
  }

  if (!amountMatches({ amount: payment.amount, currency: payment.currency }, tx)) {
    await admin
      .from("payments")
      .update({ status: "failed", gateway_response: "amount_mismatch", verified_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending");
    logger.error("Payment amount mismatch", { reference, expected: payment.amount, got: tx.amount, currency: tx.currency });
    await audit({ userId: payment.user_id, action: "billing.amount_mismatch", entityType: "payment", entityId: reference });
    return "failed";
  }

  // Claim the payment exactly once.
  const now = new Date();
  const { data: claimed } = await admin
    .from("payments")
    .update({
      status: "success",
      paid_at: tx.paidAt ?? now.toISOString(),
      verified_at: now.toISOString(),
      channel: tx.channel,
      gateway_response: tx.gatewayResponse,
    })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id");
  if (!claimed?.length) return "success"; // another worker fulfilled it concurrently

  try {
    await activateSubscription(payment, tx, now);
  } catch (e) {
    // Payment is recorded as verified; flag loudly so an admin can reconcile.
    logger.error("Subscription activation failed after verified payment", { reference, error: e instanceof Error ? e.message : "error" });
    await audit({ userId: payment.user_id, action: "billing.activation_failed", entityType: "payment", entityId: reference });
    throw new AppError("INTERNAL_ERROR", "Your payment was received but activation failed. Our team has been alerted.");
  }
  return "success";
}

async function activateSubscription(payment: PaymentRow, tx: VerifiedTransaction, now: Date) {
  const admin = createAdminClient();
  if (!payment.plan_id || !payment.billing_interval) throw new Error("Payment is missing plan/interval");
  const sub = await getSubscription(payment.user_id);

  const period = computeNewPeriod(payment.purpose, payment.billing_interval, sub?.current_period_end ?? null, now);

  let authorizationEnc: string | null | undefined;
  if (tx.authorization?.reusable) {
    const stored: StoredAuthorization = {
      code: tx.authorization.authorizationCode,
      email: tx.customerEmail ?? "",
      last4: tx.authorization.last4,
      brand: tx.authorization.brand,
      exp: tx.authorization.expMonth && tx.authorization.expYear ? `${tx.authorization.expMonth}/${tx.authorization.expYear}` : null,
      signature: tx.authorization.signature,
    };
    authorizationEnc = encryptSecret(JSON.stringify(stored));
  }

  const values = {
    plan_id: payment.plan_id,
    billing_interval: payment.billing_interval,
    status: "active" as const,
    current_period_start: period.start.toISOString(),
    current_period_end: period.end.toISOString(),
    cancel_at_period_end: false,
    pending_plan_id: null,
    pending_billing_interval: null,
    provider: "paystack" as const,
    renewal_attempts: 0,
    ...(tx.customerCode && { provider_customer_code: tx.customerCode }),
    ...(authorizationEnc && { provider_authorization_enc: authorizationEnc }),
  };

  const { data: updated, error } = await admin
    .from("subscriptions")
    .upsert({ user_id: payment.user_id, ...values }, { onConflict: "user_id" })
    .select("id, plan_id")
    .single();
  if (error || !updated) throw new Error(error?.message ?? "upsert failed");

  await admin.from("payments").update({ subscription_id: updated.id }).eq("id", payment.id);

  const { data: plan } = await admin.from("subscription_plans").select("name").eq("id", payment.plan_id).maybeSingle();
  await Promise.all([
    notify({
      userId: payment.user_id,
      category: "subscription",
      title: payment.purpose === "renewal" ? "Subscription renewed" : `Welcome to ${plan?.name ?? "your new plan"}`,
      body: `Your ${plan?.name ?? ""} plan is active until ${period.end.toDateString()}.`,
      link: "/dashboard/billing",
    }),
    audit({
      userId: payment.user_id,
      action: payment.purpose === "renewal" ? "billing.renewed" : "billing.subscription_activated",
      entityType: "subscription",
      entityId: updated.id,
      metadata: { plan_id: payment.plan_id, interval: payment.billing_interval, reference: payment.reference },
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Self-service changes
// ---------------------------------------------------------------------------

export async function cancelAtPeriodEnd(userId: string) {
  const admin = createAdminClient();
  const sub = await getSubscription(userId);
  if (!sub || !isPaidAndActive(sub)) throw new AppError("CONFLICT", "You don't have an active paid subscription.");
  await admin
    .from("subscriptions")
    .update({ cancel_at_period_end: true, status: sub.status === "past_due" ? "past_due" : "non_renewing" })
    .eq("id", sub.id);
  await audit({ userId, action: "billing.cancelled", entityType: "subscription", entityId: sub.id });
  await notify({
    userId,
    category: "subscription",
    title: "Subscription will not renew",
    body: `You keep your current plan until ${sub.current_period_end ? new Date(sub.current_period_end).toDateString() : "the end of the period"}.`,
    link: "/dashboard/billing",
  });
}

export async function resumeSubscription(userId: string) {
  const admin = createAdminClient();
  const sub = await getSubscription(userId);
  if (!sub || !isPaidAndActive(sub) || !sub.cancel_at_period_end) throw new AppError("CONFLICT", "There is no cancellation to undo.");
  await admin
    .from("subscriptions")
    .update({ cancel_at_period_end: false, status: sub.status === "non_renewing" ? "active" : sub.status })
    .eq("id", sub.id);
  await audit({ userId, action: "billing.resumed", entityType: "subscription", entityId: sub.id });
}

export async function scheduleDowngrade(userId: string, planId: string, interval: BillingInterval) {
  const admin = createAdminClient();
  const sub = await getSubscription(userId);
  if (!sub || !isPaidAndActive(sub)) throw new AppError("CONFLICT", "You're on the free plan.");
  const { plans, order } = await loadPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan || !plan.is_active) throw new AppError("NOT_FOUND", "That plan is not available.");
  const kind = classifyChange(
    { planId: sub.plan_id, interval: sub.billing_interval, isPaidAndActive: true },
    { planId, interval: planId === "free" ? "monthly" : interval },
    order,
  );
  if (kind !== "downgrade") throw new AppError("CONFLICT", "That's not a downgrade. Use checkout to upgrade.");
  await admin
    .from("subscriptions")
    .update({ pending_plan_id: planId, pending_billing_interval: planId === "free" ? null : interval, cancel_at_period_end: false, status: sub.status === "non_renewing" ? "active" : sub.status })
    .eq("id", sub.id);
  await audit({ userId, action: "billing.downgrade_scheduled", entityType: "subscription", entityId: sub.id, metadata: { plan_id: planId, interval } });
}

export async function clearPendingChange(userId: string) {
  const admin = createAdminClient();
  const sub = await getSubscription(userId);
  if (!sub?.pending_plan_id) throw new AppError("CONFLICT", "No scheduled change to cancel.");
  await admin.from("subscriptions").update({ pending_plan_id: null, pending_billing_interval: null }).eq("id", sub.id);
  await audit({ userId, action: "billing.pending_change_cleared", entityType: "subscription", entityId: sub.id });
}

// ---------------------------------------------------------------------------
// Renewal job
// ---------------------------------------------------------------------------

async function moveToFree(sub: SubscriptionRow, status: "active" | "expired", reason: string) {
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({
      plan_id: "free",
      status: "active",
      billing_interval: "monthly",
      current_period_start: new Date().toISOString(),
      current_period_end: null,
      cancel_at_period_end: false,
      pending_plan_id: null,
      pending_billing_interval: null,
      renewal_attempts: 0,
    })
    .eq("id", sub.id);
  await audit({ userId: sub.user_id, action: `billing.${status === "expired" ? "expired" : "downgraded_to_free"}`, entityType: "subscription", entityId: sub.id, metadata: { reason, previous_plan: sub.plan_id } });
  await notify({
    userId: sub.user_id,
    category: "subscription",
    title: status === "expired" ? "Your subscription has ended" : "You're now on the Free plan",
    body: status === "expired" ? "Your account has moved to the Free plan. Upgrade any time to restore paid features." : "Your scheduled downgrade has taken effect.",
    link: "/dashboard/billing",
  });
}

async function chargeRenewal(sub: SubscriptionRow): Promise<"renewed" | "pending" | "failed"> {
  const { admin, provider } = requireBillingInfra();
  const planId = sub.pending_plan_id ?? sub.plan_id;
  const interval = sub.pending_billing_interval ?? sub.billing_interval;
  const { data: plan } = await admin.from("subscription_plans").select("*").eq("id", planId).maybeSingle();

  const markFailed = async (why: string) => {
    await admin
      .from("subscriptions")
      .update({ status: "past_due", renewal_attempts: sub.renewal_attempts + 1 })
      .eq("id", sub.id);
    await notify({
      userId: sub.user_id,
      category: "subscription",
      title: "Payment for your renewal failed",
      body: `${why} Update your payment by subscribing again from the billing page to keep your plan.`,
      link: "/dashboard/billing",
      dedupeHours: 20,
    });
    return "failed" as const;
  };

  if (!plan || !plan.is_active) return markFailed("Your plan is no longer available.");
  if (!sub.provider_authorization_enc) return markFailed("No saved payment method was found.");

  let auth: StoredAuthorization;
  try {
    auth = JSON.parse(decryptSecret(sub.provider_authorization_enc)) as StoredAuthorization;
  } catch {
    return markFailed("Your saved payment method could not be used.");
  }
  if (!auth.email) {
    const { data: profile } = await admin.from("profiles").select("email").eq("id", sub.user_id).single();
    auth.email = profile?.email ?? "";
  }

  const amount = priceFor(plan, interval);
  const reference = newPaymentReference(randomUUID());
  await admin.from("payments").insert({
    user_id: sub.user_id,
    subscription_id: sub.id,
    provider: provider.id,
    reference,
    purpose: "renewal",
    plan_id: plan.id,
    billing_interval: interval,
    amount,
    currency: plan.currency,
    status: "pending",
  });

  try {
    const charge = await provider.chargeAuthorization({
      email: auth.email,
      amount,
      currency: plan.currency,
      authorizationCode: auth.code,
      reference,
      metadata: { user_id: sub.user_id, plan_id: plan.id, interval, purpose: "renewal" },
    });
    if (charge.status === "pending") return "pending"; // webhook will complete it
    if (charge.status !== "success") {
      await admin.from("payments").update({ status: "failed", gateway_response: charge.gatewayResponse }).eq("reference", reference).eq("status", "pending");
      return markFailed("Your card was declined.");
    }
    const result = await fulfilPayment(reference);
    return result === "success" ? "renewed" : result === "pending" ? "pending" : markFailed("The charge could not be verified.");
  } catch (e) {
    logger.error("Renewal charge error", e instanceof Error ? e.message : "error");
    await admin.from("payments").update({ status: "failed", gateway_response: "charge_error" }).eq("reference", reference).eq("status", "pending");
    return markFailed("We couldn't reach the payment provider.");
  }
}

export async function processRenewals(limit = 100) {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: due } = await admin
    .from("subscriptions")
    .select("*")
    .in("status", ["active", "non_renewing", "past_due"])
    .neq("plan_id", "free")
    .lte("current_period_end", nowIso)
    .order("current_period_end")
    .limit(limit);

  const counts = { checked: 0, renewed: 0, pending: 0, failed: 0, expired: 0, downgraded: 0, errors: 0 };
  for (const sub of due ?? []) {
    counts.checked++;
    try {
      const actionToTake = renewalAction(sub);
      if (actionToTake === "expire") {
        await moveToFree(sub, "expired", sub.status === "past_due" ? "renewal_failed" : "cancelled");
        counts.expired++;
      } else if (actionToTake === "downgrade_to_free") {
        await moveToFree(sub, "active", "scheduled_downgrade");
        counts.downgraded++;
      } else if (actionToTake === "charge") {
        const r = await chargeRenewal(sub);
        counts[r]++;
      }
    } catch (e) {
      counts.errors++;
      logger.error("Renewal processing error", { subscription: sub.id, error: e instanceof Error ? e.message : "error" });
    }
  }
  return counts;
}

export type { SubscriptionPlanRow };
