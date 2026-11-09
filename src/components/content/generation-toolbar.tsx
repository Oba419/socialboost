"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  CalendarPlus,
  Pencil,
  RefreshCw,
  Repeat2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/shared/copy-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiFetch, toastError } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

export interface GenerationToolbarProps {
  generationId: string | null;
  /** Plain text used for copy / edit / scheduling. */
  text: string;
  platform?: string | null;
  onRegenerate?: () => void;
  regenerating?: boolean;
  /** Called after an edit is saved with the new text. */
  onEdited?: (text: string) => void;
  onDeleted?: () => void;
  initiallySaved?: boolean;
  initialRating?: 1 | -1 | null;
  showCalendar?: boolean;
  showRepurpose?: boolean;
  className?: string;
}

/**
 * Standard actions for a generated result. Every button performs a real
 * request against /api/content/generated/:id or /api/posts.
 */
export function GenerationToolbar({
  generationId,
  text,
  platform,
  onRegenerate,
  regenerating,
  onEdited,
  onDeleted,
  initiallySaved = false,
  initialRating = null,
  showCalendar = true,
  showRepurpose = true,
  className,
}: GenerationToolbarProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [rating, setRating] = useState<1 | -1 | null>(initialRating);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    if (!generationId) return null;
    const res = await apiFetch(`/api/content/generated/${generationId}`, { method: "PATCH", json: body });
    if (!res.ok) toastError(res.error);
    return res.ok ? res : null;
  }

  async function toggleSave() {
    setBusy("save");
    const next = !saved;
    if (await patch({ isSaved: next })) {
      setSaved(next);
      toast.success(next ? "Saved to your library" : "Removed from library");
    }
    setBusy(null);
  }

  async function rate(value: 1 | -1) {
    const next = rating === value ? null : value;
    if (await patch({ rating: next })) {
      setRating(next);
      if (next) toast.success("Thanks for the feedback");
    }
  }

  async function saveEdit() {
    setBusy("edit");
    if (generationId) {
      if (await patch({ bodyText: draft, isSaved: true })) {
        setSaved(true);
        onEdited?.(draft);
        setEditing(false);
        toast.success("Changes saved");
      }
    } else {
      onEdited?.(draft);
      setEditing(false);
    }
    setBusy(null);
  }

  async function addToCalendar() {
    setBusy("calendar");
    const res = await apiFetch<{ id: string }>("/api/posts", {
      method: "POST",
      json: { body: text, platform: platform ?? null, generatedContentId: generationId },
    });
    setBusy(null);
    if (!res.ok) return toastError(res.error);
    toast.success("Draft created — pick a date and time");
    router.push(`/dashboard/calendar?schedule=${res.data.id}`);
  }

  async function remove() {
    if (!generationId) return;
    const res = await apiFetch(`/api/content/generated/${generationId}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    toast.success("Deleted");
    onDeleted?.();
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {onRegenerate && (
        <Button size="sm" variant="outline" onClick={onRegenerate} disabled={regenerating}>
          <RefreshCw className={cn("size-4", regenerating && "animate-spin")} /> Regenerate
        </Button>
      )}
      <CopyButton text={text} />
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setDraft(text);
          setEditing(true);
        }}
      >
        <Pencil className="size-4" /> Edit
      </Button>
      {generationId && (
        <Button size="sm" variant={saved ? "secondary" : "outline"} onClick={toggleSave} disabled={busy === "save"} aria-pressed={saved}>
          {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          {saved ? "Saved" : "Save"}
        </Button>
      )}
      {showCalendar && (
        <Button size="sm" variant="outline" onClick={addToCalendar} disabled={busy === "calendar"}>
          <CalendarPlus className="size-4" /> Add to calendar
        </Button>
      )}
      {showRepurpose && generationId && (
        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/repurpose?from=${generationId}`)}>
          <Repeat2 className="size-4" /> Repurpose
        </Button>
      )}
      {generationId && (
        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => rate(1)} aria-pressed={rating === 1} aria-label="Good result">
                <ThumbsUp className={cn("size-4", rating === 1 && "fill-current text-success")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Good result</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => rate(-1)} aria-pressed={rating === -1} aria-label="Poor result">
                <ThumbsDown className={cn("size-4", rating === -1 && "fill-current text-destructive")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Poor result</TooltipContent>
          </Tooltip>
          <ConfirmDialog
            trigger={
              <Button size="icon" variant="ghost" className="size-8" aria-label="Delete">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Delete this generation?"
            description="It will be removed from your history and library. This can't be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={remove}
          />
        </div>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit content</DialogTitle>
          </DialogHeader>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-72" aria-label="Content" />
          <p className="text-muted-foreground text-right text-xs tabular-nums">{draft.length} characters</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={busy === "edit" || !draft.trim()}>
              {busy === "edit" ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
