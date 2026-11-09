"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Card with a soft radial highlight that follows the pointer. */
export function SpotlightCard({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "li" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        ref.current = el;
      }}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
        el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
      }}
      className={cn("spotlight", className)}
    >
      {children}
    </Tag>
  );
}
