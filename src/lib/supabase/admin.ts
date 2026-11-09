import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ConfigurationError, requireSupabaseEnv, serverEnv } from "@/lib/env";

/**
 * Service-role client. BYPASSES Row Level Security.
 *
 * Only use after an explicit authorization check in server code (cron jobs,
 * webhooks, admin actions, token storage, usage metering). Never import from a
 * client component; `server-only` enforces this at build time.
 */
let adminClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;
  const { url } = requireSupabaseEnv();
  const serviceKey = serverEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new ConfigurationError("Supabase service role", "SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  adminClient = createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export type AdminSupabaseClient = ReturnType<typeof createAdminClient>;
