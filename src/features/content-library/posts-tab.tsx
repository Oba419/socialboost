"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Archive, CalendarPlus, FileText, ImageIcon, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { OptionSelect, PLATFORM_OPTIONS } from "@/components/forms/option-select";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { apiFetch, toastError } from "@/hooks/use-api";
import type { Paginated } from "@/lib/api/response";
import { PlatformDot, PostStatusBadge } from "@/features/content-calendar/status";
import { Pagination } from "./pagination";
import { PostEditorDialog, type PostDraftSeed } from "./post-editor-dialog";
import type { LibraryPost } from "./types";
import { useDebounced } from "./use-debounced";
import { useApiQuery } from "./use-api-query";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Drafts" },
  { value: "ready", label: "Ready" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
  { value: "archived", label: "Archived" },
];

export function PostsTab({
  canEdit,
  canSchedule,
  seed,
}: {
  canEdit: boolean;
  canSchedule: boolean;
  /** When set on mount, opens the editor pre-filled (e.g. from an idea). Remount via `key` to apply a new seed. */
  seed: PostDraftSeed | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<LibraryPost | null>(null);
  const [editorOpen, setEditorOpen] = useState(Boolean(seed));
  const [editorSeed, setEditorSeed] = useState<PostDraftSeed | null>(seed);
  const debounced = useDebounced(search);

  const qs = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (debounced.trim()) qs.set("search", debounced.trim());
  if (platform !== "all") qs.set("platform", platform);
  if (status !== "all") qs.set("status", status);
  const { data, loading, error, reload: load } = useApiQuery<Paginated<LibraryPost>>(`/api/posts?${qs}`);

  async function remove(id: string) {
    const res = await apiFetch(`/api/posts/${id}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    toast.success("Post deleted");
    await load();
  }

  async function archive(post: LibraryPost) {
    const res = await apiFetch(`/api/posts/${post.id}`, { method: "PATCH", json: { status: post.status === "archived" ? "draft" : "archived" } });
    if (!res.ok) return toastError(res.error);
    toast.success(post.status === "archived" ? "Restored to drafts" : "Archived");
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search posts…"
            className="pl-8"
            aria-label="Search posts"
          />
        </div>
        <OptionSelect
          value={platform}
          onChange={(v) => {
            setPlatform(v);
            setPage(1);
          }}
          options={[{ value: "all", label: "All platforms" }, ...PLATFORM_OPTIONS]}
          className="sm:w-44"
        />
        <OptionSelect
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          className="sm:w-40"
        />
        {canEdit && (
          <Button
            onClick={() => {
              setEditing(null);
              setEditorSeed(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="size-4" /> New draft
          </Button>
        )}
      </div>

      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load posts" description={error} action={<Button onClick={load}>Retry</Button>} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={FileText}
          title={debounced || platform !== "all" || status !== "all" ? "No posts match your filters" : "No posts yet"}
          description="Create a draft here, or generate content with the AI tools and add it to your calendar."
          action={
            canEdit ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setEditorSeed(null);
                  setEditorOpen(true);
                }}
              >
                <Plus className="size-4" /> New draft
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((p) => {
              const plat = p.platform && isPlatformId(p.platform) ? PLATFORMS[p.platform] : null;
              const mediaCount = p.post_media?.length ?? 0;
              return (
                <li key={p.id}>
                  <Card className="py-4">
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <PostStatusBadge status={p.status} />
                          {plat ? (
                            <Badge variant="secondary" className="gap-1.5 font-normal">
                              <PlatformDot color={plat.color} /> {plat.name}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-normal">Any platform</Badge>
                          )}
                          <span className="text-muted-foreground text-xs capitalize">{p.content_type}</span>
                          {mediaCount > 0 && (
                            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                              <ImageIcon className="size-3.5" /> {mediaCount}
                            </span>
                          )}
                          {p.category && <Badge variant="outline" className="font-normal">{p.category}</Badge>}
                        </div>
                        {p.title && <p className="font-medium">{p.title}</p>}
                        <p className="text-muted-foreground line-clamp-2 text-sm whitespace-pre-wrap">{p.body || "No text yet."}</p>
                        <p className="text-muted-foreground text-xs">Updated {format(new Date(p.updated_at), "d MMM yyyy, HH:mm")}</p>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1.5">
                          {canSchedule && p.status !== "published" && p.status !== "archived" && (
                            <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/calendar?schedule=${p.id}`)}>
                              <CalendarPlus className="size-4" /> Schedule
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" aria-label="Post actions">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={p.status === "published"}
                                onSelect={() => {
                                  setEditing(p);
                                  setEditorSeed(null);
                                  setEditorOpen(true);
                                }}
                              >
                                <Pencil className="size-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={p.status === "published" || p.status === "scheduled"} onSelect={() => archive(p)}>
                                <Archive className="size-4" /> {p.status === "archived" ? "Restore" : "Archive"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <ConfirmDialog
                                trigger={
                                  <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="size-4" /> Delete
                                  </DropdownMenuItem>
                                }
                                title="Delete this post?"
                                description="The post and any schedules for it will be removed. Already-published posts stay on the platform."
                                confirmLabel="Delete"
                                destructive
                                onConfirm={() => remove(p.id)}
                              />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
        </>
      )}

      {editorOpen && (
        <PostEditorDialog open={editorOpen} onOpenChange={setEditorOpen} post={editing} seed={editorSeed} onSaved={() => load()} />
      )}
    </div>
  );
}
