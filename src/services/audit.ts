import "server-only";
import { isServiceRoleConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Json } from "@/types/database";

/** Append-only audit trail for sensitive actions (service role write). */
export async function audit(entry: {
  userId: string | null;
  organizationId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, Json>;
  ip?: string | null;
}) {
  if (!isServiceRoleConfigured()) {
    logger.info("audit (no service role)", entry);
    return;
  }
  const { error } = await createAdminClient()
    .from("activity_logs")
    .insert({
      user_id: entry.userId,
      organization_id: entry.organizationId ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
      ip_address: entry.ip && entry.ip !== "unknown" ? entry.ip : null,
    });
  if (error) logger.error("Failed to write audit log", error.message);
}
