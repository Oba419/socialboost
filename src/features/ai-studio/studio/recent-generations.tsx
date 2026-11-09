"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Eye, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { useRouter } from "next/navigation";

export interface RecentItem {
  id: string;
  title: string;
  platform: string | null;
  body_text: string;
  is_saved: boolean;
  rating: 1 | -1 | null;
  created_at: string;
}

export function RecentGenerations({
  items,
  page,
  totalPages,
  basePath,
}: {
  items: RecentItem[];
  page: number;
  totalPages: number;
  basePath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<RecentItem | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" /> Recent generations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState title="No generations yet" description="Posts you generate in AI Studio are kept here." className="py-8" />
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.platform && <span className="capitalize">{item.platform} · </span>}
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
                {item.is_saved && <Badge variant="secondary">Saved</Badge>}
                <Button size="sm" variant="ghost" onClick={() => setOpen(item)} aria-label={`View ${item.title}`}>
                  <Eye className="size-4" /> View
                </Button>
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 && (
          <nav className="mt-3 flex items-center justify-between text-sm" aria-label="Pagination">
            <Button size="sm" variant="outline" asChild disabled={page <= 1}>
              <Link href={`${basePath}?page=${Math.max(1, page - 1)}`} aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
                Previous
              </Link>
            </Button>
            <span className="text-muted-foreground text-xs">
              Page {page} of {totalPages}
            </span>
            <Button size="sm" variant="outline" asChild>
              <Link href={`${basePath}?page=${Math.min(totalPages, page + 1)}`} aria-disabled={page >= totalPages} className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
                Next
              </Link>
            </Button>
          </nav>
        )}
      </CardContent>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-4">
              <p className="max-h-[50vh] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">{open.body_text}</p>
              <GenerationToolbar
                generationId={open.id}
                text={open.body_text}
                platform={open.platform}
                initiallySaved={open.is_saved}
                initialRating={open.rating}
                onEdited={() => router.refresh()}
                onDeleted={() => {
                  setOpen(null);
                  router.refresh();
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
