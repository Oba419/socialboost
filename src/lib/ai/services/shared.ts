import { z } from "zod";
import { PLATFORM_IDS, PLATFORMS, type PlatformId } from "@/config/platforms";

export const platformSchema = z.enum(PLATFORM_IDS as [PlatformId, ...PlatformId[]]);
export const shortText = (max = 200) => z.string().trim().max(max);
export const requiredText = (max = 200, label = "This field") =>
  z.string().trim().min(1, `${label} is required.`).max(max);
export const languageSchema = z.string().trim().min(1).max(40).default("English");

export function platformName(id: string): string {
  return id in PLATFORMS ? PLATFORMS[id as PlatformId].name : id;
}

export function platformNorms(id: PlatformId): string {
  const p = PLATFORMS[id];
  return `${p.name} conventions: keep the main text within ${p.textLimit ?? "the platform's"} characters.`;
}

export const hashtagsToText = (tags: string[]) =>
  tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
