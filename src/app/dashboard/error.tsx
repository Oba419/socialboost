"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="bg-destructive/10 text-destructive mb-4 inline-flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-6" />
      </span>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        We couldn&apos;t load this page. Please try again.{error.digest ? ` (ref: ${error.digest})` : ""}
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
