"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { OptionSelect } from "@/components/forms/option-select";
import { apiFetch, toastError } from "@/hooks/use-api";
import { MEDIA_ACCEPT, formatBytes } from "./media-config";
import { MediaThumb } from "./media-thumb";
import { Pagination } from "./pagination";
import { uploadMediaFile, useMediaList } from "./use-media";

export function MediaTab({ canEdit }: { canEdit: boolean }) {
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useMediaList({ kind: kind === "all" ? undefined : kind, page });
  const [uploading, setUploading] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 10);
    if (!list.length) return;
    setUploading(list.map((f) => f.name));
    let ok = 0;
    for (const file of list) {
      const result = await uploadMediaFile(file);
      if (result) ok++;
      setUploading((u) => u.filter((n) => n !== file.name));
    }
    if (ok) toast.success(`${ok} file${ok > 1 ? "s" : ""} uploaded`);
    await reload();
  }

  async function setCategory(id: string, category: string) {
    const res = await apiFetch(`/api/media/${id}`, { method: "PATCH", json: { category: category || null } });
    if (!res.ok) toastError(res.error);
    else toast.success("Category updated");
  }

  async function remove(id: string) {
    const res = await apiFetch(`/api/media/${id}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    toast.success("File deleted");
    await reload();
  }

  const usedPct = data ? Math.min(100, Math.round((data.storage.usedBytes / Math.max(1, data.storage.limitBytes)) * 100)) : 0;

  return (
    <div className="space-y-4">
      {canEdit && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : ""}`}
        >
          <ImagePlus className="text-muted-foreground size-7" />
          <p className="text-sm font-medium">Drag images or videos here</p>
          <p className="text-muted-foreground text-xs">JPG, PNG, WebP, GIF, MP4, MOV or WebM · up to 100 MB each</p>
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading.length > 0}>
            {uploading.length ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading.length ? `Uploading ${uploading.length}…` : "Choose files"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={MEDIA_ACCEPT}
            multiple
            className="sr-only"
            aria-label="Upload media files"
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <OptionSelect
          value={kind}
          onChange={(v) => {
            setKind(v);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All media" },
            { value: "image", label: "Images" },
            { value: "video", label: "Videos" },
          ]}
          className="w-40"
        />
        {data && (
          <div className="flex min-w-48 items-center gap-2 text-xs">
            <span className="text-muted-foreground tabular-nums">
              {formatBytes(data.storage.usedBytes)} of {formatBytes(data.storage.limitBytes)}
            </span>
            <Progress value={usedPct} className="h-1.5 w-24" aria-label="Storage used" />
          </div>
        )}
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load media" description={error} action={<Button onClick={reload}>Retry</Button>} />
      ) : !data?.items.length ? (
        <EmptyState icon={ImagePlus} title="No media yet" description="Upload images and videos to reuse them across your posts." />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.items.map((m) => (
              <li key={m.id}>
                <Card className="gap-0 overflow-hidden p-0">
                  <MediaThumb item={m} className="aspect-square w-full" />
                  <div className="space-y-2 p-2.5">
                    <p className="truncate text-xs font-medium" title={m.file_name}>
                      {m.file_name}
                    </p>
                    <p className="text-muted-foreground text-[11px]">{formatBytes(m.size_bytes)}</p>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <Input
                          defaultValue={m.category ?? ""}
                          placeholder="Category"
                          className="h-7 text-xs"
                          aria-label={`Category for ${m.file_name}`}
                          maxLength={60}
                          onBlur={(e) => {
                            if ((e.target.value || null) !== m.category) void setCategory(m.id, e.target.value.trim());
                          }}
                        />
                        <ConfirmDialog
                          trigger={
                            <Button size="icon" variant="ghost" className="size-7 shrink-0" aria-label={`Delete ${m.file_name}`}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          }
                          title="Delete this file?"
                          description="It will be removed from storage and from any posts that use it."
                          confirmLabel="Delete"
                          destructive
                          onConfirm={() => remove(m.id)}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
