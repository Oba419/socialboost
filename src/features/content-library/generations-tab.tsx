"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FilePlus2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { OptionSelect, PLATFORM_OPTIONS } from "@/components/forms/option-select";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { apiFetch, toastError } from "@/hooks/use-api";
import type { Paginated } from "@/lib/api/response";
import { Pagination } from "./pagination";
import { SERVICE_LABELS, type LibraryGeneration } from "./types";
import { useDebounced } from "./use-debounced";
import { useApiQuery } from "./use-api-query";

export function GenerationsTab({ canEdit, onPostCreated }: { canEdit: boolean; onPostCreated: () => void }) {
  const [search, setSearch] = useState("");
  const [service, setService] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [scope, setScope] = useState<"saved" | "all">("saved");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<LibraryGeneration | null>(null);
  const debounced = useDebounced(search);

  const qs = new URLSearchParams({ page: String(page), pageSize: "20", scope });
  if (debounced.trim()) qs.set("search", debounced.trim());
  if (service !== "all") qs.set("service", service);
  if (platform !== "all") qs.set("platform", platform);
  const { data, loading, error, reload: load } = useApiQuery<Paginated<LibraryGeneration>>(`/api/library/generations?${qs}`);

  async function createPost(g: LibraryGeneration) {
    const res = await apiFetch("/api/posts", {
      method: "POST",
      json: { title: g.title.slice(0, 200), body: g.body_text.slice(0, 20000), platform: g.platform && isPlatformId(g.platform) ? g.platform : null, generatedContentId: g.id },
    });
    if (!res.ok) return toastError(res.error);
    toast.success("Draft post created");
    onPostCreated();
  }

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-48 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} placeholder="Search generations…" className="pl-8" aria-label="Search generations" />
        </div>
        <OptionSelect
          value={service}
          onChange={resetPage(setService)}
          options={[{ value: "all", label: "All tools" }, ...Object.entries(SERVICE_LABELS).map(([value, label]) => ({ value, label }))]}
          className="sm:w-44"
        />
        <OptionSelect value={platform} onChange={resetPage(setPlatform)} options={[{ value: "all", label: "All platforms" }, ...PLATFORM_OPTIONS]} className="sm:w-40" />
        <OptionSelect
          value={scope}
          onChange={(v) => resetPage(setScope)(v as "saved" | "all")}
          options={[
            { value: "saved", label: "Saved only" },
            { value: "all", label: "All history" },
          ]}
          className="sm:w-36"
        />
      </div>

      {loading && !data ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load generations" description={error} action={<Button onClick={load}>Retry</Button>} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Sparkles}
          title={scope === "saved" ? "No saved generations" : "No generations yet"}
          description="Use the AI tools and press Save on results you want to keep."
        />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {data.items.map((g) => {
              const plat = g.platform && isPlatformId(g.platform) ? PLATFORMS[g.platform] : null;
              return (
                <li key={g.id}>
                  <Card className="h-full py-4">
                    <CardContent className="flex h-full flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="font-normal">{SERVICE_LABELS[g.service] ?? g.service}</Badge>
                        {plat && <Badge variant="outline" className="font-normal">{plat.name}</Badge>}
                        {!g.is_saved && <Badge variant="outline" className="text-muted-foreground font-normal">History</Badge>}
                      </div>
                      <button type="button" onClick={() => setOpen(g)} className="text-left font-medium hover:underline">
                        {g.title}
                      </button>
                      <p className="text-muted-foreground line-clamp-3 flex-1 text-sm whitespace-pre-wrap">{g.body_text}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-xs">{format(new Date(g.created_at), "d MMM yyyy")}</span>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setOpen(g)}>
                            Open
                          </Button>
                          {canEdit && (
                            <Button size="sm" variant="outline" onClick={() => createPost(g)}>
                              <FilePlus2 className="size-4" /> Create post
                            </Button>
                          )}
                        </div>
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

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
                <DialogDescription>
                  {SERVICE_LABELS[open.service] ?? open.service} · {format(new Date(open.created_at), "d MMM yyyy, HH:mm")}
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted/40 max-h-[50vh] overflow-y-auto rounded-lg border p-4 text-sm leading-relaxed whitespace-pre-wrap">{open.body_text}</div>
              {canEdit && (
                <GenerationToolbar
                  key={open.id}
                  generationId={open.id}
                  text={open.body_text}
                  platform={open.platform}
                  initiallySaved={open.is_saved}
                  initialRating={open.rating}
                  onEdited={(t) => {
                    setOpen({ ...open, body_text: t, is_saved: true });
                    void load();
                  }}
                  onDeleted={() => {
                    setOpen(null);
                    void load();
                  }}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
