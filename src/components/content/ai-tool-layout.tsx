import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Two-column layout used by every AI tool: inputs on the left, results on the right. */
export function AIToolLayout({
  form,
  results,
  formTitle = "Details",
  formDescription,
  className,
}: {
  form: React.ReactNode;
  results: React.ReactNode;
  formTitle?: string;
  formDescription?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]", className)}>
      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="text-base">{formTitle}</CardTitle>
          {formDescription && <CardDescription>{formDescription}</CardDescription>}
        </CardHeader>
        <CardContent>{form}</CardContent>
      </Card>
      <section aria-live="polite" className="min-w-0 space-y-4">
        {results}
      </section>
    </div>
  );
}
