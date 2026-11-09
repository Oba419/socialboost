/* eslint-disable @next/next/no-img-element -- signed, short-lived private URLs; next/image caching would outlive them */
import { Film, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaItem } from "./media-config";

export function MediaThumb({ item, className }: { item: MediaItem; className?: string }) {
  if (!item.url) {
    return (
      <div className={cn("bg-muted text-muted-foreground flex items-center justify-center", className)}>
        <ImageOff className="size-6" />
      </div>
    );
  }
  if (item.kind === "video") {
    return (
      <div className={cn("relative bg-black", className)}>
        <video src={item.url} className="size-full object-cover" muted preload="metadata" playsInline />
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/60 p-1 text-white">
          <Film className="size-3.5" />
        </span>
      </div>
    );
  }
  return <img src={item.url} alt={item.file_name} className={cn("object-cover", className)} loading="lazy" />;
}
