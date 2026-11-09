"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FilePlus2, Lightbulb, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { OptionSelect } from "@/components/forms/option-select";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { apiFetch, toastError } from "@/hooks/use-api";
import type { Paginated } from "@/lib/api/response";
import { Pagination } from "./pagination";
import type { PostDraftSeed } from "./post-editor-dialog";
import type { LibraryIdea } from "./types";
import { useDebounced } from "./use-debounced";
import { useApiQuery } from "./use-api-query";

export function IdeasTab({ canEdit, onCreatePost }: { canEdit: boolean; onCreatePost: (seed: PostDraftSeed) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("saved");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);

  const qs = new URLSearchParams({ page: String(page), pageSize: "24" });
  if (status !== "all") qs.set("status", status);
  if (debounced.trim()) qs.set("search", debounced.trim());
  const { data, loading, error, reload: load } = useApiQuery<Paginated<LibraryIdea>>(`/api/ideas?${qs}`);

  async function updateStatus(id: string, next: LibraryIdea["status"]) {
    const res = await apiFetch(`/api/ideas/${id}`, { method: "PATCH", json: { status: next } });
    if (!res.ok) return toastError(res.error);
    await load();
  }

  async function remove(id: string) {
    const res = await apiFetch(`/api/ideas/${id}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    toast.success("Idea deleted");
    await load();
  }

  function toPost(idea: LibraryIdea) {
    const body = [idea.hook, idea.description, idea.cta].filter(Boolean).join("\n\n");
    onCreatePost({ title: idea.title, body, platform: idea.platform, hashtags: idea.hashtags });
    if (idea.status === "saved") void updateStatus(idea.id, "used");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search ideas…"
            className="pl-8"
            aria-label="Search ideas"
          />
        </div>
        <OptionSelect
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: "saved", label: "Saved" },
            { value: "used", label: "Used" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "All ideas" },
          ]}
          className="sm:w-40"
        />
      </div>

      {loading && !data ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load ideas" description={error} action={<Button onClick={load}>Retry</Button>} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Lightbulb}
          title="No ideas here yet"
          description="Generate ideas with the Content Ideas tool and save the ones you like."
          action={
            <Button asChild variant="outline">
              <Link href="/dashboard/ideas">Generate ideas</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((idea) => {
              const plat = idea.platform && isPlatformId(idea.platform) ? PLATFORMS[idea.platform] : null;
              return (
                <li key={idea.id}>
                  <Card className="h-full gap-3 py-4">
                    <CardHeader className="gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {plat && <Badge variant="secondary" className="font-normal">{plat.name}</Badge>}
                        {idea.format && <Badge variant="outline" className="font-normal">{idea.format}</Badge>}
                        {idea.status !== "saved" && <Badge variant="outline" className="text-muted-foreground font-normal capitalize">{idea.status}</Badge>}
                      </div>
                      <CardTitle className="text-sm leading-snug">{idea.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-2 text-sm">
                      <p className="text-muted-foreground line-clamp-3">{idea.description}</p>
                      {idea.hook && (
                        <p className="line-clamp-2">
                          <span className="font-medium">Hook: </span>
                          {idea.hook}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                        {canEdit && (
                          <>
                            <Button size="sm" onClick={() => toPost(idea)}>
                              <FilePlus2 className="size-4" /> Create post
                            </Button>
                            {idea.status !== "used" && (
                              <Button size="sm" variant="ghost" onClick={() => updateStatus(idea.id, "used")}>
                                <CheckCircle2 className="size-4" /> Mark used
                              </Button>
                            )}
                            <ConfirmDialog
                              trigger={
                                <Button size="icon" variant="ghost" className="ml-auto size-8" aria-label="Delete idea">
                                  <Trash2 className="size-4" />
                                </Button>
                              }
                              title="Delete this idea?"
                              confirmLabel="Delete"
                              destructive
                              onConfirm={() => remove(idea.id)}
                            />
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
