"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-2 pt-2" aria-label="Pagination">
      <p className="text-muted-foreground text-xs tabular-nums">
        Page {page} of {totalPages} · {total} items
      </p>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" /> Prev
        </Button>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
