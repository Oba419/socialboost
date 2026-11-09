"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Loader2, RefreshCw, Settings2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PLATFORM_LIST, PLATFORMS, type CapabilityLevel, type PlatformId } from "@/config/platforms";
import { apiFetch, toastError } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

export interface ConnectedAccountView {
  id: string;
  platform: PlatformId;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  status: "connected" | "expired" | "revoked" | "error";
  scopes: string[];
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "That integration is awaiting setup by the administrator.",
  invalid_state: "The connection request expired or didn't match. Please try again.",
  access_denied: "Authorization was cancelled on the platform.",
  missing_code: "The platform didn't return an authorization code. Please try again.",
  forbidden: "You don't have permission to connect accounts in this workspace.",
  limit_reached: "You've reached your plan's connected-account limit. Upgrade to connect more.",
  rate_limited: "Too many connection attempts. Please wait a few minutes.",
  connect_failed: "We couldn't complete the connection. Please try again.",
  no_eligible_account: "No eligible account was found. Check the account requirements for this platform.",
  unknown_platform: "Unknown platform.",
};

const CAPABILITY_ROWS: { key: keyof (typeof PLATFORMS)["x"]["capabilities"]; label: string }[] = [
  { key: "followerCount", label: "Follower count" },
  { key: "accountInsights", label: "Account insights" },
  { key: "postInsights", label: "Post insights" },
  { key: "publishText", label: "Publish text" },
  { key: "publishImage", label: "Publish images" },
  { key: "publishVideo", label: "Publish video" },
];

function CapabilityBadge({ level }: { level: CapabilityLevel }) {
  const map = {
    supported: { label: "Available", cls: "border-success/40 text-success" },
    limited: { label: "Limited", cls: "border-warning/50 text-warning" },
    unsupported: { label: "Unavailable", cls: "text-muted-foreground" },
  } as const;
  return (
    <Badge variant="outline" className={cn("font-normal", map[level].cls)}>
      {map[level].label}
    </Badge>
  );
}

function formatDate(iso: string | null, timezone: string) {
  if (!iso) return "Never";
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function AccountsManager({
  accounts,
  status,
  limit,
  planName,
  canEdit,
  timezone,
  flash,
}: {
  flash: { connected?: string; error?: string; skipped?: string };
  accounts: ConnectedAccountView[];
  status: Record<PlatformId, { configured: boolean; requiredEnv: string[] }>;
  limit: number;
  planName: string;
  canEdit: boolean;
  timezone: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    const { connected, error, skipped } = flash;
    if (!connected && !error) return;
    shown.current = true;
    if (connected && connected in PLATFORMS) {
      toast.success(`${PLATFORMS[connected as PlatformId].name} connected`, {
        description: skipped ? `${skipped} account(s) skipped because of your plan limit.` : undefined,
      });
    } else if (error) {
      toast.error(ERROR_MESSAGES[error] ?? "Something went wrong while connecting.");
    }
    router.replace("/dashboard/accounts", { scroll: false });
  }, [flash, router]);

  const atLimit = accounts.length >= limit;

  async function sync(id: string) {
    setBusy(`sync:${id}`);
    const res = await apiFetch<{ metrics: number }>(`/api/social/accounts/${id}`, { method: "POST", json: { action: "sync" } });
    setBusy(null);
    if (!res.ok) return toastError(res.error);
    toast.success(`Synced ${res.data.metrics} data point${res.data.metrics === 1 ? "" : "s"}`);
    router.refresh();
  }

  async function disconnect(id: string) {
    const res = await apiFetch<{ revoked: boolean }>(`/api/social/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    toast.success("Account disconnected", {
      description: res.data.revoked ? "Access was revoked on the platform and stored credentials were deleted." : "Stored credentials were deleted.",
    });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="connected-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="connected-heading" className="text-lg font-semibold">
            Connected accounts
          </h2>
          <p className="text-muted-foreground text-sm tabular-nums">
            {accounts.length} of {limit} on your {planName} plan
          </p>
        </div>
        {accounts.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No accounts connected yet"
            description="Connect a platform below to pull real follower counts and insights. Until then, you can add figures manually on the Analytics page."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {accounts.map((a) => {
              const p = PLATFORMS[a.platform];
              const name = a.display_name ?? a.username ?? p.name;
              return (
                <Card key={a.id} className="gap-3 py-4">
                  <CardContent className="flex items-start gap-3 px-4">
                    <Avatar className="size-10">
                      {a.avatar_url && <AvatarImage src={a.avatar_url} alt="" />}
                      <AvatarFallback style={{ color: p.color }}>{p.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{name}</p>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {p.name}
                        {a.username ? ` · @${a.username.replace(/^@/, "")}` : ""}
                        {a.account_type ? ` · ${a.account_type}` : ""}
                      </p>
                      <p className="text-muted-foreground text-xs">Last synced: {formatDate(a.last_synced_at, timezone)}</p>
                      {a.last_error && (
                        <p className="text-destructive flex items-start gap-1 text-xs">
                          <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {a.last_error}
                        </p>
                      )}
                      {a.scopes.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="text-muted-foreground text-xs underline-offset-4 hover:underline">
                            Permissions granted ({a.scopes.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-1 flex flex-wrap gap-1">
                            {a.scopes.map((s) => (
                              <code key={s} className="bg-muted rounded px-1 py-0.5 text-[10px]">
                                {s.replace("https://www.googleapis.com/auth/", "")}
                              </code>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </CardContent>
                  {canEdit && (
                    <CardFooter className="flex flex-wrap gap-2 px-4">
                      {a.status === "connected" ? (
                        <Button size="sm" variant="outline" onClick={() => sync(a.id)} disabled={busy === `sync:${a.id}` || !status[a.platform].configured}>
                          <RefreshCw className={cn("size-4", busy === `sync:${a.id}` && "animate-spin")} /> Sync now
                        </Button>
                      ) : (
                        <Button size="sm" asChild disabled={!status[a.platform].configured}>
                          <a href={`/api/social/${a.platform}/connect`}>
                            <RefreshCw className="size-4" /> Reconnect
                          </a>
                        </Button>
                      )}
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Unplug className="size-4" /> Disconnect
                          </Button>
                        }
                        title={`Disconnect ${name}?`}
                        description="We'll revoke access where the platform allows it and permanently delete the stored credentials. Previously synced metrics remain in your analytics."
                        confirmLabel="Disconnect"
                        destructive
                        onConfirm={() => disconnect(a.id)}
                      />
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="platforms-heading" className="space-y-3">
        <div>
          <h2 id="platforms-heading" className="text-lg font-semibold">
            Available platforms
          </h2>
          <p className="text-muted-foreground text-sm">
            Capabilities differ by platform and depend on each platform approving this app. Unavailable features are shown honestly.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PLATFORM_LIST.map((p) => {
            const st = status[p.id];
            const count = accounts.filter((a) => a.platform === p.id).length;
            return (
              <Card key={p.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span aria-hidden className="size-2.5 rounded-full" style={{ background: p.color }} />
                      {p.name}
                    </CardTitle>
                    {st.configured ? (
                      count > 0 ? (
                        <Badge variant="outline" className="border-success/40 text-success font-normal">
                          <CheckCircle2 /> {count} connected
                        </Badge>
                      ) : null
                    ) : (
                      <Badge variant="outline" className="border-warning/50 text-warning font-normal">
                        <Settings2 /> Awaiting setup
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{p.accountRequirements}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-sm">
                    {CAPABILITY_ROWS.map((row) => (
                      <div key={row.key} className="contents">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd>
                          <CapabilityBadge level={p.capabilities[row.key] as CapabilityLevel} />
                        </dd>
                      </div>
                    ))}
                    <dt className="text-muted-foreground">Scheduling</dt>
                    <dd>
                      <Badge variant="outline" className="font-normal">
                        {p.capabilities.scheduling === "manual" ? "Manual workflow" : "Auto-publish"}
                      </Badge>
                    </dd>
                  </dl>
                  <Collapsible>
                    <CollapsibleTrigger className="text-muted-foreground text-xs underline-offset-4 hover:underline">
                      Developer approval requirements
                    </CollapsibleTrigger>
                    <CollapsibleContent className="text-muted-foreground mt-2 space-y-2 text-xs">
                      <p>{p.approvalNotes}</p>
                      {!st.configured && (
                        <p>
                          Required environment variables:{" "}
                          {st.requiredEnv.map((v) => (
                            <code key={v} className="bg-muted mr-1 rounded px-1 py-0.5">
                              {v}
                            </code>
                          ))}
                        </p>
                      )}
                      <a href={p.docsUrl} target="_blank" rel="noreferrer noopener" className="text-primary inline-flex items-center gap-1 hover:underline">
                        Official API docs <ExternalLink className="size-3" />
                      </a>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
                <CardFooter>
                  {!canEdit ? (
                    <p className="text-muted-foreground text-xs">View-only access</p>
                  ) : st.configured ? (
                    atLimit ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="w-full">
                            <Button className="w-full" disabled>
                              Connect {p.name}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Account limit reached for your plan</TooltipContent>
                      </Tooltip>
                    ) : (
                      <ConnectButton platform={p.id} name={p.name} />
                    )
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      Awaiting setup
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ConnectButton({ platform, name }: { platform: PlatformId; name: string }) {
  const [going, setGoing] = useState(false);
  return (
    <Button className="w-full" asChild onClick={() => setGoing(true)}>
      <a href={`/api/social/${platform}/connect`} aria-busy={going}>
        {going ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Connect {name}
      </a>
    </Button>
  );
}

function StatusBadge({ status }: { status: ConnectedAccountView["status"] }) {
  const map = {
    connected: { label: "Connected", cls: "border-success/40 text-success" },
    expired: { label: "Needs reconnect", cls: "border-warning/50 text-warning" },
    revoked: { label: "Revoked", cls: "border-destructive/40 text-destructive" },
    error: { label: "Error", cls: "border-destructive/40 text-destructive" },
  } as const;
  return (
    <Badge variant="outline" className={cn("font-normal", map[status].cls)}>
      {map[status].label}
    </Badge>
  );
}
