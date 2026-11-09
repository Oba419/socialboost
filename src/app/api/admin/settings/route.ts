import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { requireApiAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/services/audit";
import type { Json } from "@/types/database";

const keySchema = z.string().regex(/^[a-z][a-z0-9_.-]{1,62}$/, "Invalid key.");
const putSchema = z.object({
  key: keySchema,
  value: z.string().max(20_000),
});

/** PUT /api/admin/settings — upsert a JSON setting. */
export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiAdmin();
  const input = await parseJson(req, putSchema);
  let value: Json;
  try {
    value = JSON.parse(input.value) as Json;
  } catch {
    throw new AppError("VALIDATION_ERROR", "Value must be valid JSON.");
  }
  const { error } = await createAdminClient()
    .from("app_settings")
    .upsert({ key: input.key, value, updated_by: ctx.userId, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new AppError("INTERNAL_ERROR", "Could not save the setting.");
  await audit({ userId: ctx.userId, action: "admin.setting_saved", entityType: "app_setting", entityId: input.key, metadata: { value } });
  return { saved: true };
});

/** DELETE /api/admin/settings?key=… */
export const DELETE = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiAdmin();
  const key = keySchema.parse(req.nextUrl.searchParams.get("key") ?? "");
  const { error } = await createAdminClient().from("app_settings").delete().eq("key", key);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the setting.");
  await audit({ userId: ctx.userId, action: "admin.setting_deleted", entityType: "app_setting", entityId: key });
  return { deleted: true };
});
