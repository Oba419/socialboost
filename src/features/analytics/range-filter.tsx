"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OptionSelect } from "@/components/forms/option-select";
import { PLATFORMS, type PlatformId } from "@/config/platforms";

export interface RangeFilterProps {
  range: string;
  from: string;
  to: string;
  platform?: string;
  accountId?: string;
  platforms?: PlatformId[];
  accounts?: { id: string; label: string; platform: string }[];
}

const PRESETS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

/** URL-driven date / platform / account filter shared by Overview and Analytics. */
export function RangeFilter({ range, from, to, platform, accountId, platforms, accounts }: RangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [open, setOpen] = useState(false);

  function push(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { range, from: range === "custom" ? from : undefined, to: range === "custom" ? to : undefined, platform, account: accountId, ...next };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all") params.set(k, v);
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  const today = new Date().toISOString().slice(0, 10);
  const customValid = customFrom && customTo && customFrom <= customTo && customTo <= today;
  const visibleAccounts = (accounts ?? []).filter((a) => !platform || a.platform === platform);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <div role="group" aria-label="Date range" className="bg-muted inline-flex rounded-lg p-0.5">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={range === p.value ? "secondary" : "ghost"}
            className={range === p.value ? "bg-background shadow-sm" : ""}
            aria-pressed={range === p.value}
            onClick={() => push({ range: p.value, from: undefined, to: undefined })}
          >
            {p.label.replace("Last ", "")}
          </Button>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant={range === "custom" ? "secondary" : "ghost"} className={range === "custom" ? "bg-background shadow-sm" : ""} aria-pressed={range === "custom"}>
              <CalendarRange className="size-4" /> {range === "custom" ? `${from} → ${to}` : "Custom"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="range-from">From</Label>
                <Input id="range-from" type="date" max={today} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="range-to">To</Label>
                <Input id="range-to" type="date" max={today} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
            {!customValid && <p className="text-destructive text-xs">Choose a valid range (start before end, not in the future).</p>}
            <Button
              size="sm"
              className="w-full"
              disabled={!customValid}
              onClick={() => {
                setOpen(false);
                push({ range: "custom", from: customFrom, to: customTo });
              }}
            >
              Apply
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      {platforms && platforms.length > 0 && (
        <OptionSelect
          className="h-8 w-40"
          value={platform ?? "all"}
          onChange={(v) => push({ platform: v, account: undefined })}
          options={[{ value: "all", label: "All platforms" }, ...platforms.map((p) => ({ value: p, label: PLATFORMS[p].name }))]}
        />
      )}
      {visibleAccounts.length > 0 && (
        <OptionSelect
          className="h-8 w-48"
          value={accountId ?? "all"}
          onChange={(v) => push({ account: v })}
          options={[{ value: "all", label: "All accounts" }, ...visibleAccounts.map((a) => ({ value: a.id, label: a.label }))]}
        />
      )}
      {pending && <Loader2 className="text-muted-foreground size-4 animate-spin" aria-label="Loading" />}
    </div>
  );
}
