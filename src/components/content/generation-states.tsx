import { AlertTriangle, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SetupRequired } from "@/components/shared/setup-required";
import { EmptyState } from "@/components/shared/empty-state";

export function GenerationLoading({ label = "Generating with AI…" }: { label?: string }) {
  return (
    <div className="bg-card space-y-4 rounded-xl border p-6" role="status" aria-label={label}>
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Sparkles className="text-primary size-4 animate-pulse" /> {label}
      </div>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function GenerationError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>Generation failed</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-1 font-medium underline underline-offset-4">
            Try again
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function GenerationEmpty({ title, description }: { title: string; description: string }) {
  return <EmptyState icon={Sparkles} title={title} description={description} className="bg-card/50 py-16" />;
}

/** Rendered (server-side decision) when OPENAI_API_KEY is missing. */
export function AIUnavailable() {
  return (
    <SetupRequired integration="AI generation (OpenAI)" envVars={["OPENAI_API_KEY"]}>
      <p className="mt-1">Until it is configured, generation requests are rejected rather than simulated.</p>
    </SetupRequired>
  );
}
