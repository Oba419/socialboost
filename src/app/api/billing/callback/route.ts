import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { fulfilPayment, type FulfilResult } from "@/services/billing";

/**
 * GET /api/billing/callback?reference=… — Paystack redirects here after
 * checkout. The query string is untrusted: we only use the reference to look
 * up OUR payment record and verify it server-side.
 */
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref");
  const target = new URL("/dashboard/billing", req.nextUrl.origin);

  let status: FulfilResult | "error" = "error";
  if (reference && /^sb_[a-f0-9]{32}$/.test(reference)) {
    try {
      // Require a signed-in user to show a result page; fulfilment itself is
      // keyed on the payment record and is also completed by the webhook.
      await getAuthUser();
      status = await fulfilPayment(reference);
    } catch (e) {
      logger.error("Billing callback error", e instanceof Error ? e.message : "error");
      status = "pending";
    }
  }

  target.searchParams.set(
    "status",
    status === "success" ? "success" : status === "failed" || status === "not_found" || status === "error" ? "failed" : "pending",
  );
  return NextResponse.redirect(target);
}
