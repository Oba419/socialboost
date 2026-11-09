"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MEDIA_ACCEPT } from "./media-config";
import { MediaThumb } from "./media-thumb";
import { uploadMediaFile, useMediaList } from "./use-media";

/** Select up to `max` media files for a post; supports uploading inline. */
export function MediaPicker({
  value,
  onChange,
  max = 10,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}) {
  const { data, loading, reload } = useMediaList({ pageSize: 60 });
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (value.length < max) onChange([...value, id]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {value.length} of {max} selected
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_ACCEPT}
          className="sr-only"
          aria-label="Upload a media file"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setUploading(true);
            const item = await uploadMediaFile(file);
            setUploading(false);
            await reload();
            if (item && value.length < max) onChange([...value, item.id]);
          }}
        />
      </div>
      {loading && !data ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">No media yet. Upload an image or video.</p>
      ) : (
        <ul className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5" role="listbox" aria-multiselectable aria-label="Media">
          {data.items.map((m) => {
            const selected = value.includes(m.id);
            const order = value.indexOf(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => toggle(m.id)}
                  className={cn(
                    "relative block aspect-square w-full overflow-hidden rounded-md border-2 outline-none focus-visible:ring-2",
                    selected ? "border-primary" : "border-transparent",
                  )}
                  title={m.file_name}
                >
                  <MediaThumb item={m} className="size-full" />
                  {selected && (
                    <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex size-5 items-center justify-center rounded-full text-[10px] font-semibold">
                      {order >= 0 ? order + 1 : <Check className="size-3" />}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
