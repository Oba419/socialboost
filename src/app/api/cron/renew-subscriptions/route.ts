import { route } from "@/lib/api/handler";
import { assertCronAuth, runJob } from "@/lib/jobs";
import { processRenewals } from "@/services/billing";

export const maxDuration = 300;

/** GET /api/cron/renew-subscriptions — daily: renewals, expiries, scheduled downgrades. */
export const GET = route(async (req) => {
  assertCronAuth(req);
  return runJob("renew-subscriptions", () => processRenewals(100));
});
