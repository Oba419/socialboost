"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdeaGenerator } from "./idea-generator";
import { SavedIdeas } from "./saved-ideas";

export function IdeasWorkspace({ aiReady, initialTab }: { aiReady: boolean; initialTab: "generate" | "saved" }) {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <Tabs defaultValue={initialTab} className="gap-4">
      <TabsList>
        <TabsTrigger value="generate">Generate</TabsTrigger>
        <TabsTrigger value="saved">Saved ideas</TabsTrigger>
      </TabsList>
      <TabsContent value="generate">
        <IdeaGenerator aiReady={aiReady} onSaved={() => setRefreshKey((k) => k + 1)} />
      </TabsContent>
      <TabsContent value="saved">
        <SavedIdeas refreshKey={refreshKey} />
      </TabsContent>
    </Tabs>
  );
}
