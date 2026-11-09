"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { OptionSelect, PLATFORM_OPTIONS } from "@/components/forms/option-select";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { apiFetch, toastError } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { MediaPicker } from "./media-picker";
import { splitTags, type LibraryPost } from "./types";

const CONTENT_TYPES = [
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "carousel", label: "Carousel" },
  { value: "thread", label: "Thread" },
  { value: "story", label: "Story" },
];

const formSchema = z.object({
  title: z.string().max(200),
  platform: z.string(),
  contentType: z.enum(["text", "image", "video", "carousel", "thread", "story"]),
  body: z.string().max(20000, "Posts can be up to 20,000 characters."),
  hashtags: z.string().max(3000),
  tags: z.string().max(1000),
  category: z.string().max(60),
  mediaIds: z.array(z.string()).max(10),
});
type FormValues = z.infer<typeof formSchema>;

export interface PostDraftSeed {
  title?: string;
  body?: string;
  platform?: string | null;
  hashtags?: string[];
}

function defaults(post?: LibraryPost | null, seed?: PostDraftSeed | null): FormValues {
  return {
    title: post?.title ?? seed?.title ?? "",
    platform: post?.platform ?? (seed?.platform && isPlatformId(seed.platform) ? seed.platform : "none"),
    contentType: post?.content_type ?? "text",
    body: post?.body ?? seed?.body ?? "",
    hashtags: (post?.hashtags ?? seed?.hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" "),
    tags: (post?.tags ?? []).join(", "),
    category: post?.category ?? "",
    mediaIds: [...(post?.post_media ?? [])].sort((a, b) => a.position - b.position).map((m) => m.media_id),
  };
}

export function PostEditorDialog({
  open,
  onOpenChange,
  post,
  seed,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: LibraryPost | null;
  seed?: PostDraftSeed | null;
  onSaved: (post: LibraryPost) => void;
}) {
  // Mounted fresh each time it opens, so defaults come straight from props.
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults(post, seed) });
  const { register, handleSubmit, control, formState } = form;

  const platform = useWatch({ control, name: "platform" });
  const body = useWatch({ control, name: "body" }) ?? "";
  const limit = isPlatformId(platform) ? PLATFORMS[platform].textLimit : null;
  const over = limit !== null && body.length > limit;

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      title: values.title.trim() || undefined,
      body: values.body,
      platform: isPlatformId(values.platform) ? values.platform : null,
      contentType: values.contentType,
      hashtags: splitTags(values.hashtags),
      tags: splitTags(values.tags),
      category: values.category.trim() || null,
      mediaIds: values.mediaIds,
    };
    const res = post
      ? await apiFetch<LibraryPost>(`/api/posts/${post.id}`, { method: "PATCH", json: payload })
      : await apiFetch<LibraryPost>("/api/posts", { method: "POST", json: payload });
    if (!res.ok) return toastError(res.error);
    toast.success(post ? "Post updated" : "Draft saved");
    onSaved(res.data);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{post ? "Edit post" : "New draft"}</DialogTitle>
          <DialogDescription>Drafts are saved to your library. Schedule them from the calendar when you&apos;re ready.</DialogDescription>
        </DialogHeader>
        <form id="post-editor" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Platform" htmlFor="pe-platform">
              <Controller
                control={control}
                name="platform"
                render={({ field }) => (
                  <OptionSelect
                    id="pe-platform"
                    value={field.value}
                    onChange={field.onChange}
                    options={[{ value: "none", label: "Not decided yet" }, ...PLATFORM_OPTIONS]}
                  />
                )}
              />
            </Field>
            <Field label="Content type" htmlFor="pe-type">
              <Controller
                control={control}
                name="contentType"
                render={({ field }) => <OptionSelect id="pe-type" value={field.value} onChange={field.onChange} options={CONTENT_TYPES} />}
              />
            </Field>
          </div>
          <Field label="Internal title (optional)" htmlFor="pe-title">
            <Input id="pe-title" placeholder="e.g. Product launch teaser" {...register("title")} />
          </Field>
          <Field label="Post text" htmlFor="pe-body" error={formState.errors.body?.message}>
            <Textarea id="pe-body" rows={8} placeholder="Write your post…" aria-invalid={over} {...register("body")} />
            <p className={cn("text-right text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
              {body.length}
              {limit ? ` / ${limit}` : ""} characters
              {over && isPlatformId(platform) ? ` — over ${PLATFORMS[platform].name}'s limit` : ""}
            </p>
          </Field>
          <Field label="Hashtags" htmlFor="pe-hashtags" hint="Separate with spaces or commas.">
            <Input id="pe-hashtags" placeholder="#smallbusiness #lagos" {...register("hashtags")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tags" htmlFor="pe-tags" hint="For organising your library.">
              <Input id="pe-tags" placeholder="launch, q4" {...register("tags")} />
            </Field>
            <Field label="Category" htmlFor="pe-category">
              <Input id="pe-category" placeholder="e.g. Educational" {...register("category")} />
            </Field>
          </div>
          <Field label="Media">
            <Controller control={control} name="mediaIds" render={({ field }) => <MediaPicker value={field.value} onChange={field.onChange} />} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="post-editor" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Saving…" : post ? "Save changes" : "Save draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
