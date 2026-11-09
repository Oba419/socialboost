"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenerationsTab } from "./generations-tab";
import { IdeasTab } from "./ideas-tab";
import { MediaTab } from "./media-tab";
import { PostsTab } from "./posts-tab";
import type { PostDraftSeed } from "./post-editor-dialog";

export type LibraryTab = "posts" | "generations" | "ideas" | "media";

export function LibraryTabs({ initialTab, canEdit, canSchedule }: { initialTab: LibraryTab; canEdit: boolean; canSchedule: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const [seed, setSeed] = useState<PostDraftSeed | null>(null);
  // Bumped to force the posts tab to refetch after posts are created elsewhere.
  const [postsKey, setPostsKey] = useState(0);

  const changeTab = useCallback(
    (value: string) => {
      setTab(value as LibraryTab);
      router.replace(`${pathname}?tab=${value}`, { scroll: false });
    },
    [router, pathname],
  );

  return (
    <Tabs value={tab} onValueChange={changeTab} className="gap-5">
      <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
        <TabsTrigger value="posts">Posts &amp; drafts</TabsTrigger>
        <TabsTrigger value="generations">AI generations</TabsTrigger>
        <TabsTrigger value="ideas">Saved ideas</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
      </TabsList>
      <TabsContent value="posts">
        <PostsTab key={postsKey} canEdit={canEdit} canSchedule={canSchedule} seed={seed} />
      </TabsContent>
      <TabsContent value="generations">
        <GenerationsTab
          canEdit={canEdit}
          onPostCreated={() => {
            setSeed(null);
            setPostsKey((k) => k + 1);
            changeTab("posts");
          }}
        />
      </TabsContent>
      <TabsContent value="ideas">
        <IdeasTab
          canEdit={canEdit}
          onCreatePost={(s) => {
            setSeed(s);
            setPostsKey((k) => k + 1);
            changeTab("posts");
          }}
        />
      </TabsContent>
      <TabsContent value="media">
        <MediaTab canEdit={canEdit} />
      </TabsContent>
    </Tabs>
  );
}
