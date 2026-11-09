import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { AIUnavailable } from "@/components/content/generation-states";
import type { FeatureKey } from "@/config/plans";

/** Server-rendered frame shared by AI tool pages: header + plan gate + AI config notice. */
export function ToolPage({
  icon,
  title,
  description,
  feature,
  locked,
  planName,
  aiReady,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  feature: FeatureKey;
  locked: boolean;
  planName: string;
  aiReady: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader icon={icon} title={title} description={description} actions={actions} />
      {locked ? (
        <UpgradePrompt feature={feature} currentPlan={planName} />
      ) : (
        <>
          {!aiReady && <AIUnavailable />}
          {children}
        </>
      )}
    </div>
  );
}
