"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiFetch, toastError } from "@/hooks/use-api";
import { formatMoney } from "@/config/plans";
import { classifyChange } from "@/lib/payments/billing-math";
import { cn } from "@/lib/utils";
import type { BillingInterval } from "@/types/database";
import type { PlanCardData, SubscriptionView, UsageLimit, UsageView } from "./types";

const STATUS_LABEL: Record<SubscriptionView["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "border-success/40 text-success" },
  non_renewing: { label: "Cancels at period end", className: "border-warning/50 text-warning" },
  past_due: { label: "Payment overdue", className: "border-destructive/40 text-destructive" },
  cancelled: { label: "Cancelled", className: "text-muted-foreground" },
  expired: { label: "Expired", className: "text-muted-foreground" },
};

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function UsageRow({ label, value }: { label: string; value: UsageLimit }) {
  const pct = value.limit === null ? 0 : value.limit === 0 ? 100 : Math.min(100, Math.round((value.used / value.limit) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {value.used} / {value.limit === null ? "Unlimited" : value.limit}
        </span>
      </div>
      {value.limit !== null && <Progress value={pct} aria-label={`${label} usage`} className={cn(pct >= 90 && "[&>div]:bg-destructive")} />}
    </div>
  );
}

export function BillingOverview({
  subscription,
  plans,
  usage,
  checkoutEnabled,
  status,
  preselectPlan,
}: {
  subscription: SubscriptionView;
  plans: PlanCardData[];
  usage: UsageView;
  checkoutEnabled: boolean;
  status?: string;
  preselectPlan?: string;
}) {
  const router = useRouter();
  const [interval, setBillingInterval] = useState<BillingInterval>(subscription.effectivePlanId !== "free" ? subscription.interval : "monthly");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const handledStatus = useRef(false);

  const order = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p.sortOrder])), [plans]);
  const isPaid = subscription.effectivePlanId !== "free";
  const planName = (id: string | null) => plans.find((p) => p.id === id)?.name ?? id ?? "";

  useEffect(() => {
    if (handledStatus.current || !status) return;
    handledStatus.current = true;
    // The page was rendered from the server after verification, so `isPaid`
    // reflects verified state — never the redirect parameter alone.
    if (status === "success" && isPaid) toast.success(`Payment confirmed — you're on the ${subscription.effectivePlanName} plan.`);
    else if (status === "success" || status === "pending") toast.info("We're confirming your payment. This page will update once it's verified.");
    else if (status === "failed") toast.error("The payment wasn't completed. You have not been charged for a plan change.");
    router.replace("/dashboard/billing", { scroll: false });
  }, [status, isPaid, subscription.effectivePlanName, router]);

  useEffect(() => {
    if (preselectPlan && plansRef.current) plansRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [preselectPlan]);

  async function checkout(planId: string) {
    setBusyPlan(planId);
    const res = await apiFetch<{ authorizationUrl: string }>("/api/billing/checkout", { method: "POST", json: { planId, interval } });
    if (!res.ok) {
      setBusyPlan(null);
      return toastError(res.error);
    }
    // Full navigation to the payment gateway (external origin).
    window.location.assign(res.data.authorizationUrl);
  }

  async function subscriptionAction(body: Record<string, unknown>, success: string) {
    const res = await apiFetch("/api/billing/subscription", { method: "POST", json: body });
    if (!res.ok) return toastError(res.error);
    toast.success(success);
    router.refresh();
  }

  const st = STATUS_LABEL[subscription.status];
  const creditsPct = usage.creditsLimit > 0 ? Math.min(100, Math.round((usage.creditsUsed / usage.creditsLimit) * 100)) : 100;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Current plan</CardDescription>
            <CardTitle className="flex flex-wrap items-center gap-2 text-2xl">
              {subscription.effectivePlanName}
              {isPaid && (
                <Badge variant="outline" className={st.className}>
                  {st.label}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isPaid ? (
              <>
                <p className="flex items-center gap-2">
                  <CalendarClock className="text-muted-foreground size-4" />
                  {subscription.cancelAtPeriodEnd || subscription.status === "non_renewing"
                    ? `Access until ${fmtDate(subscription.periodEnd)}`
                    : `${subscription.interval === "annual" ? "Annual" : "Monthly"} · renews ${fmtDate(subscription.periodEnd)}`}
                </p>
                {subscription.card && (
                  <p className="flex items-center gap-2">
                    <CreditCard className="text-muted-foreground size-4" /> {subscription.card}
                  </p>
                )}
                {subscription.status === "past_due" && (
                  <p className="text-destructive flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    Your renewal payment failed. Paid features stay on for a short grace period — choose your plan below to pay again.
                  </p>
                )}
                {subscription.pendingPlanId && (
                  <p className="bg-muted rounded-md px-3 py-2">
                    Scheduled change: <strong>{planName(subscription.pendingPlanId)}</strong>
                    {subscription.pendingInterval ? ` (${subscription.pendingInterval})` : ""} from {fmtDate(subscription.periodEnd)}.
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">You&apos;re on the free plan. Upgrade any time for more AI credits and features.</p>
            )}
          </CardContent>
          {isPaid && (
            <CardFooter className="flex flex-wrap gap-2">
              {subscription.cancelAtPeriodEnd || subscription.status === "non_renewing" ? (
                <ConfirmDialog
                  trigger={<Button size="sm">Resume subscription</Button>}
                  title="Resume your subscription?"
                  description={`Your ${subscription.effectivePlanName} plan will renew automatically on ${fmtDate(subscription.periodEnd)}.`}
                  confirmLabel="Resume"
                  onConfirm={() => subscriptionAction({ action: "resume" }, "Subscription resumed")}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      Cancel subscription
                    </Button>
                  }
                  title="Cancel your subscription?"
                  description={`You'll keep ${subscription.effectivePlanName} features until ${fmtDate(subscription.periodEnd)}, then move to the Free plan. No refunds are issued for the current period.`}
                  confirmLabel="Cancel at period end"
                  destructive
                  onConfirm={() => subscriptionAction({ action: "cancel" }, "Your subscription will end at the period end")}
                />
              )}
              {subscription.pendingPlanId && (
                <Button size="sm" variant="ghost" onClick={() => subscriptionAction({ action: "clear_pending" }, "Scheduled change cancelled")}>
                  Keep current plan
                </Button>
              )}
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Usage this period · {usage.planName} plan</CardDescription>
            <CardTitle className="flex items-baseline gap-2 text-2xl tabular-nums">
              {Math.max(0, usage.creditsLimit - usage.creditsUsed)}
              <span className="text-muted-foreground text-sm font-normal">of {usage.creditsLimit} AI credits left</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Progress value={creditsPct} aria-label="AI credits used" className={cn(creditsPct >= 90 && "[&>div]:bg-destructive")} />
              <p className="text-muted-foreground text-xs">
                {usage.creditsUsed} used · resets {fmtDate(usage.periodEnd)}
              </p>
            </div>
            <UsageRow label="Saved items (this workspace)" value={usage.savedItems} />
            <UsageRow label="Connected social accounts" value={usage.socialAccounts} />
            <UsageRow label="Scheduled posts this month" value={usage.scheduledPosts} />
          </CardContent>
        </Card>
      </div>

      <div ref={plansRef} className="scroll-mt-24 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Plans</h2>
            <p className="text-muted-foreground text-sm">Upgrades take effect immediately. Downgrades apply at the end of your billing period.</p>
          </div>
          <Tabs value={interval} onValueChange={(v) => setBillingInterval(v as BillingInterval)}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annual">Annual · 2 months free</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan) => {
            const price = interval === "annual" ? plan.priceAnnual : plan.priceMonthly;
            const kind = classifyChange(
              { planId: subscription.effectivePlanId, interval: subscription.interval, isPaidAndActive: isPaid },
              { planId: plan.id, interval: plan.id === "free" ? "monthly" : interval },
              order,
            );
            const isCurrent = kind === "same" || (plan.id === "free" && !isPaid);
            const isPending = subscription.pendingPlanId === plan.id;
            const selected = preselectPlan === plan.id;

            let cta: React.ReactNode;
            if (isCurrent) {
              cta = (
                <Button className="w-full" variant="secondary" disabled>
                  <Check className="size-4" /> Current plan
                </Button>
              );
            } else if (isPending) {
              cta = (
                <Button className="w-full" variant="outline" disabled>
                  Scheduled
                </Button>
              );
            } else if (kind === "downgrade") {
              cta = (
                <ConfirmDialog
                  trigger={
                    <Button className="w-full" variant="outline">
                      Schedule downgrade
                    </Button>
                  }
                  title={`Downgrade to ${plan.name}?`}
                  description={`You'll keep ${subscription.effectivePlanName} until ${fmtDate(subscription.periodEnd)}. After that ${
                    plan.id === "free" ? "your account moves to the Free plan." : `you'll be charged ${formatMoney(price, plan.currency)} for ${plan.name}.`
                  } Features not included in ${plan.name} will be locked.`}
                  confirmLabel="Schedule downgrade"
                  onConfirm={() =>
                    subscriptionAction({ action: "downgrade", planId: plan.id, interval }, `${plan.name} scheduled for ${fmtDate(subscription.periodEnd)}`)
                  }
                />
              );
            } else {
              cta = (
                <Button
                  className="w-full"
                  variant={plan.highlighted || selected ? "default" : "outline"}
                  disabled={!checkoutEnabled || busyPlan !== null}
                  onClick={() => checkout(plan.id)}
                >
                  {busyPlan === plan.id ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {kind === "upgrade" ? "Upgrade" : "Choose plan"}
                </Button>
              );
            }

            return (
              <Card
                key={plan.id}
                className={cn(
                  "flex flex-col",
                  plan.highlighted && "border-primary/50",
                  selected && !isCurrent && "ring-primary ring-2",
                  isCurrent && "bg-muted/40",
                )}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    {plan.name}
                    {plan.highlighted && <Badge>Popular</Badge>}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p>
                    <span className="text-2xl font-semibold tabular-nums">
                      {plan.startingFrom && price > 0 ? "From " : ""}
                      {formatMoney(price, plan.currency)}
                    </span>
                    {price > 0 && <span className="text-muted-foreground text-sm"> / {interval === "annual" ? "year" : "month"}</span>}
                  </p>
                  <ul className="space-y-2 text-sm">
                    {plan.bullets.map((b) => (
                      <li key={b} className="flex gap-2">
                        <Check className="text-primary mt-0.5 size-4 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  {plan.startingFrom && <p className="text-muted-foreground text-xs">Larger teams: contact us for custom pricing.</p>}
                </CardContent>
                <CardFooter>{cta}</CardFooter>
              </Card>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          Prices in Nigerian naira. Payments are processed securely by Paystack; your plan changes only after the payment is verified on our
          server.
        </p>
      </div>
    </div>
  );
}
