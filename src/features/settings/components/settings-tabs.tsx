"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SETTINGS_TABS = [
  { value: "profile", label: "Profile" },
  { value: "brand", label: "Brand profile" },
  { value: "appearance", label: "Appearance" },
  { value: "notifications", label: "Notifications" },
  { value: "workspaces", label: "Workspaces & team" },
  { value: "security", label: "Security & data" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];

export function SettingsTabs({ initialTab, panels }: { initialTab: SettingsTab; panels: Record<SettingsTab, React.ReactNode> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = (params.get("tab") as SettingsTab | null) ?? initialTab;
  const value = SETTINGS_TABS.some((t) => t.value === current) ? current : "profile";

  return (
    <Tabs
      value={value}
      onValueChange={(v) => {
        const next = new URLSearchParams(params.toString());
        next.set("tab", v);
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }}
      className="gap-6"
    >
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList className="w-max">
          {SETTINGS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {SETTINGS_TABS.map((t) => (
        <TabsContent key={t.value} value={t.value} className="max-w-3xl">
          {panels[t.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
