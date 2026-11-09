/**
 * Minimal structured logger that redacts secrets. Swap the sink for your
 * observability provider in production.
 */
const SECRET_PATTERNS: RegExp[] = [
  /(sk-[A-Za-z0-9_-]{10,})/g, // OpenAI
  /(sk_(live|test)_[A-Za-z0-9]+)/g, // Paystack
  /(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g, // JWTs
  /("?(access_token|refresh_token|authorization_code|client_secret|password)"?\s*[:=]\s*"?)[^",\s}]+/gi,
];

export function redact(input: string): string {
  return SECRET_PATTERNS.reduce(
    (s, re) => s.replace(re, (_m, p1: string) => (p1 && /[:=]/.test(p1) ? `${p1}[REDACTED]` : "[REDACTED]")),
    input,
  );
}

function serialize(value: unknown): string {
  if (value instanceof Error) return redact(`${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`);
  try {
    return redact(typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    return "[unserializable]";
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => console.info(`[info] ${msg}`, meta === undefined ? "" : serialize(meta)),
  warn: (msg: string, meta?: unknown) => console.warn(`[warn] ${msg}`, meta === undefined ? "" : serialize(meta)),
  error: (msg: string, meta?: unknown) => console.error(`[error] ${msg}`, meta === undefined ? "" : serialize(meta)),
};
