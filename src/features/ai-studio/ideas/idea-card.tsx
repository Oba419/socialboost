"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, PenSquare, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { tag } from "../shared";

export interface IdeaView {
  title: string;
  description: string;
  targetAudience: string | null;
  platform: string | null;
  format: string | null;
  hook: string | null;
  cta: string | null;
  hashtags: string[];
  rationale: string | null;
  suggestedDay?: string | null;
}

export function ideaPostHref(idea: IdeaView) {
  const p = new URLSearchParams({ topic: `${idea.title}. ${idea.description}`.slice(0, 290) });
  if (idea.platform) p.set("platform", idea.platform.toLowerCase());
  if (idea.format) p.set("format", idea.format);
  if (idea.targetAudience) p.set("audience", idea.targetAudience.slice(0, 190));
  return `/dashboard/studio?${p.toString()}`;
}

export function ideaScriptHref(idea: IdeaView) {
  return `/dashboard/video-scripts?${new URLSearchParams({ topic: `${idea.title}. ${idea.hook ?? ""}`.slice(0, 290) }).toString()}`;
}

export function IdeaCard({
  idea,
  saved,
  onSave,
  saving,
  footerExtra,
}: {
  idea: IdeaView;
  saved?: boolean;
  onSave?: () => void;
  saving?: boolean;
  footerExtra?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap gap-1.5">
          {idea.suggestedDay && <Badge>{idea.suggestedDay}</Badge>}
          {idea.platform && <Badge variant="secondary" className="capitalize">{idea.platform}</Badge>}
          {idea.format && <Badge variant="outline">{idea.format}</Badge>}
        </div>
        <CardTitle className="text-base leading-snug">{idea.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm">
        <p className="text-muted-foreground">{idea.description}</p>
        {idea.hook && (
          <p>
            <span className="font-medium">Hook: </span>
            {idea.hook}
          </p>
        )}
        {idea.cta && (
          <p>
            <span className="font-medium">CTA: </span>
            {idea.cta}
          </p>
        )}
        {idea.targetAudience && (
          <p>
            <span className="font-medium">Audience: </span>
            {idea.targetAudience}
          </p>
        )}
        {idea.hashtags.length > 0 && <p className="text-primary text-xs">{idea.hashtags.map(tag).join(" ")}</p>}
        {idea.rationale && (
          <p className="bg-muted/60 rounded-md p-2 text-xs">
            <span className="font-medium">Why it may resonate: </span>
            {idea.rationale}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-1.5">
        {onSave && (
          <Button size="sm" variant={saved ? "secondary" : "outline"} onClick={onSave} disabled={saved || saving}>
            {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            {saved ? "Saved" : "Save idea"}
          </Button>
        )}
        <Button size="sm" variant="outline" asChild>
          <Link href={ideaPostHref(idea)}>
            <PenSquare className="size-4" /> Turn into post
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={ideaScriptHref(idea)}>
            <Video className="size-4" /> Turn into script
          </Link>
        </Button>
        {footerExtra}
      </CardFooter>
    </Card>
  );
}
