"use client";

import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMMON_TIME_ZONES } from "./timezone";

export function TimeZoneSelect({
  id,
  value,
  onChange,
  extra = [],
  className,
}: {
  id?: string;
  value: string;
  onChange: (tz: string) => void;
  extra?: string[];
  className?: string;
}) {
  const zones = [...new Set([value, ...extra, ...COMMON_TIME_ZONES])];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={className ?? "w-full"} aria-label="Timezone">
        <Globe className="size-4 opacity-60" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {zones.map((z) => (
          <SelectItem key={z} value={z}>
            {z.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
