"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, CheckCircle2, Lightbulb, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { OptionSelect } from "@/components/forms/option-select";
import { apiFetch, toastError } from "@/hooks/use-api";
import type { Paginated } from "@/lib/api/response";
import type { ContentIdeaRow } from "@/types/database";
import { IdeaCard } from "./idea-card";

const STATUS_OPTIONS = [
  { value: "saved", label: "Saved" },
  { value: "used", label: "Used" },
  { value: "archived", label: "Archived" },
];

export function SavedIdeas({ refreshKey }: { refreshKey: number }) {
  const [status, setStatus] = useState("saved");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [nonce, setNonce] = useState(0);
  const requestKey = `${status}|${page}|${query}|${refreshKey}|${nonce}`;
  const [state, setState] = useState<{ key: string; data: Paginated<ContentIdeaRow> | null; error: string | null }>({
    key: "",
    data: null,
    error: null,
  });
  const loading = state.key !== requestKey;
  const data = state.data;
  const failed = loading ? null : state.error;
  const load = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ status, page: String(page), pageSize: "12" });
      if (query) params.set("search", query);
      const res = await apiFetch<Paginated<ContentIdeaRow>>(`/api/ideas?${params}`);
      if (cancelled) return;
      setState((prev) =>
        res.ok ? { key: requestKey, data: res.data, error: null } : { key: requestKey, data: prev.data, error: res.error.message },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [status, page, query, requestKey]);

  async function setIdeaStatus(id: string, next: string) {
    const res = await apiFetch(`/api/ideas/${id}`, { method: "PATCH", json: { status: next } });
    if (!res.ok) return toastError(res.error);
    toast.success(next === "used" ? "Marked as used" : next === "archived" ? "Archived" : "Restored");
    void load();
  }

  async function remove(id: string) {
    const res = await apiFetch(`/api/ideas/${id}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    toast.success("Idea deleted");
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input aria-label="Search ideas" placeholder="Search saved ideas…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <OptionSelect
          value={status}
          onChange={(v) => {
            setPage(1);
            setStatus(v);
          }}
          options={STATUS_OPTIONS}
          className="w-full sm:w-40"
        />
      </div>

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : failed ? (
        <EmptyState title="Couldn't load ideas" description={failed} action={<Button onClick={load}>Retry</Button>} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No ideas here yet" description="Generate ideas and save the ones you like." />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={{
                  title: idea.title,
                  description: idea.description,
                  targetAudience: idea.target_audience,
                  platform: idea.platform,
                  format: idea.format,
                  hook: idea.hook,
                  cta: idea.cta,
                  hashtags: idea.hashtags,
                  rationale: idea.rationale,
                }}
                footerExtra={
                  <div className="ml-auto flex gap-0.5">
                    {idea.status === "saved" ? (
                      <>
                        <Button size="icon" variant="ghost" className="size-8" aria-label="Mark as used" onClick={() => setIdeaStatus(idea.id, "used")}>
                          <CheckCircle2 className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" aria-label="Archive" onClick={() => setIdeaStatus(idea.id, "archived")}>
                          <Archive className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="icon" variant="ghost" className="size-8" aria-label="Restore" onClick={() => setIdeaStatus(idea.id, "saved")}>
                        <RotateCcw className="size-4" />
                      </Button>
                    )}
                    <ConfirmDialog
                      trigger={
                        <Button size="icon" variant="ghost" className="size-8" aria-label="Delete idea">
                          <Trash2 className="size-4" />
                        </Button>
                      }
                      title="Delete this idea?"
                      description="This can't be undone."
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => remove(idea.id)}
                    />
                  </div>
                }
              />
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-muted-foreground text-xs">
                Page {data.page} of {data.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
