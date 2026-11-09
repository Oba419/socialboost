"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORM_LIST } from "@/config/platforms";

export type Option = string | { value: string; label: string };

export function OptionSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  ariaInvalid,
  className,
}: {
  id?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: readonly Option[];
  placeholder?: string;
  ariaInvalid?: boolean;
  className?: string;
}) {
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={ariaInvalid} className={className ?? "w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export const PLATFORM_OPTIONS: Option[] = PLATFORM_LIST.map((p) => ({ value: p.id, label: p.name }));

export function PlatformSelect(props: Omit<React.ComponentProps<typeof OptionSelect>, "options">) {
  return <OptionSelect placeholder="Choose platform" {...props} options={PLATFORM_OPTIONS} />;
}
