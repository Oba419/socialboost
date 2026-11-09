import { Settings2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Shown wherever an integration is not configured. Never fake success:
 * tell the operator exactly which variables are missing.
 */
export function SetupRequired({
  integration,
  envVars,
  children,
}: {
  integration: string;
  envVars: string[];
  children?: React.ReactNode;
}) {
  return (
    <Alert className="border-warning/40 bg-warning/5">
      <Settings2 className="text-warning" />
      <AlertTitle>{integration} is awaiting setup</AlertTitle>
      <AlertDescription>
        <p>
          This feature needs {envVars.length > 1 ? "these environment variables" : "this environment variable"}:{" "}
          {envVars.map((v, i) => (
            <span key={v}>
              <code className="bg-muted rounded px-1 py-0.5 text-xs">{v}</code>
              {i < envVars.length - 1 ? ", " : ""}
            </span>
          ))}
          . See README.md for setup steps.
        </p>
        {children}
      </AlertDescription>
    </Alert>
  );
}
