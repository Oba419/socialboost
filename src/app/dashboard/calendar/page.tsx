import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { CalendarView } from "@/features/content-calendar/calendar-view";
import { isValidTimeZone } from "@/features/content-calendar/timezone";
import type { CalendarAccount, SchedulablePost } from "@/features/content-calendar/types";
import { loadDashboardPage } from "@/lib/auth/page";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";

export const metadata = { title: "Content Calendar" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ schedule?: string }> }) {
  const { ctx, ent, locked } = await loadDashboardPage("content_calendar");
  const { schedule } = await searchParams;

  if (locked) {
    return (
      <div className="space-y-6">
        <PageHeader icon={CalendarDays} title="Content Calendar" description="Plan, schedule and track your posts across platforms." />
        <UpgradePrompt feature="content_calendar" currentPlan={ent.plan.name} />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, username, display_name, status")
    .eq("organization_id", ctx.organization.id)
    .order("platform");

  let presetPost: SchedulablePost | null = null;
  const postId = z.string().uuid().safeParse(schedule);
  if (postId.success) {
    const { data } = await supabase
      .from("social_posts")
      .select("id, title, body, platform, status")
      .eq("id", postId.data)
      .eq("organization_id", ctx.organization.id)
      .maybeSingle();
    if (data && data.status !== "published") presetPost = data;
  }

  const tz = isValidTimeZone(ctx.profile.timezone) ? ctx.profile.timezone : siteConfig.defaultTimezone;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarDays}
        title="Content Calendar"
        description="Plan, schedule and track your posts. Posts only show as published once the platform confirms it — or when you mark a manual post as done."
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/library">Drafts library</Link>
          </Button>
        }
      />
      <CalendarView
        userTimeZone={tz}
        accounts={(accounts ?? []) as CalendarAccount[]}
        presetPost={presetPost}
        canEdit={ctx.role !== "viewer"}
      />
    </div>
  );
}
