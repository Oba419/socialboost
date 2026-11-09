import { AdminTitle } from "@/features/admin/ui";
import { SettingsEditor } from "@/features/admin/settings-editor";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Admin · System config" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const { data } = await createAdminClient().from("app_settings").select("key, value, updated_at").order("key");
  return (
    <div className="space-y-4">
      <AdminTitle
        title="System configuration"
        description="Key/value flags stored in app_settings (JSON values). Secrets never belong here — use environment variables."
      />
      <SettingsEditor settings={(data ?? []).map((s) => ({ key: s.key, value: JSON.stringify(s.value, null, 2), updatedAt: s.updated_at }))} />
    </div>
  );
}
