import { PLATFORMS, isPlatformId } from "@/config/platforms";

export const platformLabel = (p: string) => (isPlatformId(p) ? PLATFORMS[p].name : p);

export function fmtMetric(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en", { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}
