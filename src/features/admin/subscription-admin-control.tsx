"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/forms/option-select";
import { apiFetch, toastError } from "@/hooks/use-api";
import { ReasonDialog } from "./reason-dialog";

export function SubscriptionAdminControl({
  userId,
  plans,
  currentPlanId,
}: {
  userId: string;
  plans: { id: string; name: string }[];
  currentPlanId: string;
}) {
  const router = useRouter();
  const [days, setDays] = useState("30");
  const [planId, setPlanId] = useState(currentPlanId);
  const [interval, setInterval_] = useState<"monthly" | "annual">("monthly");

  async function submit(body: Record<string, unknown>, success: string) {
    const res = await apiFetch(`/api/admin/subscriptions/${userId}`, { method: "POST", json: body });
    if (!res.ok) {
      toastError(res.error);
      return false;
    }
    toast.success(success);
    router.refresh();
    return true;
  }

  const daysNum = Number.parseInt(days, 10);
  const daysField = (
    <div className="space-y-1.5">
      <Label htmlFor={`days-${userId}`}>Days</Label>
      <Input id={`days-${userId}`} type="number" min={1} max={366} value={days} onChange={(e) => setDays(e.target.value)} />
    </div>
  );

  return (
    <div className="flex flex-wrap gap-2">
      <ReasonDialog
        trigger={
          <Button size="sm" variant="outline">
            Extend period
          </Button>
        }
        title="Extend the current billing period"
        description="Adds days to the current paid period without charging the user (e.g. goodwill credit)."
        confirmLabel="Extend"
        onConfirm={(reason) => submit({ action: "extend", days: daysNum, reason }, `Extended by ${daysNum} days`)}
      >
        {daysField}
      </ReasonDialog>
      <ReasonDialog
        trigger={
          <Button size="sm" variant="outline">
            Set plan
          </Button>
        }
        title="Set plan manually"
        description="Overrides the user's plan without a payment. Use for support cases only."
        confirmLabel="Set plan"
        onConfirm={(reason) =>
          submit({ action: "set_plan", planId, interval, days: daysNum, reason }, "Plan updated")
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`plan-${userId}`}>Plan</Label>
            <OptionSelect id={`plan-${userId}`} value={planId} onChange={setPlanId} options={plans.map((p) => ({ value: p.id, label: p.name }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`interval-${userId}`}>Interval</Label>
            <OptionSelect
              id={`interval-${userId}`}
              value={interval}
              onChange={(v) => setInterval_(v as "monthly" | "annual")}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "annual", label: "Annual" },
              ]}
            />
          </div>
        </div>
        {planId !== "free" && daysField}
      </ReasonDialog>
    </div>
  );
}
