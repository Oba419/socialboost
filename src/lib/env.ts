import { z } from "zod";

/**
 * Environment validation.
 *
 * Integrations are optional: the app boots without them and shows an explicit
 * "awaiting setup" state instead of faking success. Each integration exposes an
 * `is*Configured()` helper; server code that needs a secret calls the matching
 * getter, which throws a typed ConfigurationError if it is missing or invalid.
 */

export class ConfigurationError extends Error {
  readonly code = "NOT_CONFIGURED";
  constructor(public readonly integration: string, message?: string) {
    super(message ?? `${integration} is not configured. See README.md › Configuration.`);
    this.name = "ConfigurationError";
  }
}

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: optional,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optional,
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: optional,
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: optional,
  NEXT_PUBLIC_DEMO_MODE: optional,
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optional,
  OPENAI_API_KEY: optional,
  OPENAI_MODEL_DEFAULT: z.string().default("gpt-5-mini"),
  OPENAI_MODEL_ADVANCED: z.string().default("gpt-5"),
  OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(4000),
  PAYSTACK_SECRET_KEY: optional,
  TOKEN_ENCRYPTION_KEY: optional,
  OAUTH_STATE_SECRET: optional,
  CRON_SECRET: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  CONTACT_INBOX_EMAIL: optional,
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them in client bundles.
export const publicEnv: PublicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
});

let cachedServerEnv: ServerEnv | null = null;

/** Server-only environment. Never import the result into client components. */
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  if (!cachedServerEnv) {
    cachedServerEnv = serverSchema.parse(process.env);
  }
  return cachedServerEnv;
}

export const isSupabaseConfigured = () =>
  Boolean(publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isServiceRoleConfigured = () =>
  isSupabaseConfigured() && Boolean(serverEnv().SUPABASE_SERVICE_ROLE_KEY);

export const isOpenAIConfigured = () => Boolean(serverEnv().OPENAI_API_KEY);

export const isPaystackConfigured = () =>
  Boolean(serverEnv().PAYSTACK_SECRET_KEY && publicEnv.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY);

export const isEmailConfigured = () => Boolean(serverEnv().RESEND_API_KEY && serverEnv().EMAIL_FROM);

export const isGoogleAuthEnabled = () => publicEnv.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

/** Demo fixtures are only ever shown when this flag is explicitly enabled. */
export const isDemoMode = () => publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";

export function requireSupabaseEnv() {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new ConfigurationError("Supabase");
  return { url, anonKey };
}

/** 32-byte key, provided as 64 hex chars or base64. */
export function requireEncryptionKey(): Buffer {
  const raw = serverEnv().TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new ConfigurationError("Token encryption", "TOKEN_ENCRYPTION_KEY is not set.");
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new ConfigurationError("Token encryption", "TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
  }
  return key;
}
