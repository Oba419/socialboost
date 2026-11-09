import { BookMarked } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LibraryTabs, type LibraryTab } from "@/features/content-library/library-tabs";
import { loadDashboardPage } from "@/lib/auth/page";
import { hasFeature } from "@/lib/entitlements";

export const metadata = { title: "Content Library" };

const TABS: LibraryTab[] = ["posts", "generations", "ideas", "media"];

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { ctx, ent } = await loadDashboardPage();
  const { tab } = await searchParams;
  const initialTab = TABS.includes(tab as LibraryTab) ? (tab as LibraryTab) : "posts";

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookMarked}
        title="Content Library"
        description="Your drafts, saved AI generations, ideas and media — all in one place."
      />
      <LibraryTabs
        initialTab={initialTab}
        canEdit={ctx.role !== "viewer"}
        canSchedule={hasFeature(ent.plan, "content_calendar")}
      />
    </div>
  );
}
