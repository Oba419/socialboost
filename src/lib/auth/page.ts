import "server-only";
import type { FeatureKey } from "@/config/plans";
import { getContextEntitlements, hasFeature } from "@/lib/entitlements";
import { requireOnboardedUser } from "./session";

/**
 * Standard loader for dashboard pages: verified user + workspace +
 * entitlements, and whether the page's feature is locked for this plan.
 */
export async function loadDashboardPage(feature?: FeatureKey) {
  const ctx = await requireOnboardedUser();
  const ent = await getContextEntitlements(ctx);
  const locked = feature ? !hasFeature(ent.plan, feature) : false;
  return { ctx, ent, locked };
}
