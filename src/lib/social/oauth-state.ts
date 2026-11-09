import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { ConfigurationError, publicEnv, serverEnv } from "@/lib/env";
import { hmacSha256, randomToken, safeEqual } from "@/lib/security/crypto";
import type { PlatformId } from "@/config/platforms";

/**
 * OAuth CSRF protection: the `state` and PKCE verifier live in a signed,
 * httpOnly, SameSite=Lax cookie scoped to the callback path, bound to the
 * user and workspace that started the flow, and valid for 10 minutes.
 */
const TTL_SECONDS = 600;
const cookieName = (platform: PlatformId) => `sb_oauth_${platform}`;

const payloadSchema = z.object({
  state: z.string().min(16),
  codeVerifier: z.string().nullable(),
  platform: z.string(),
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  exp: z.number(),
});
export type OAuthStatePayload = z.infer<typeof payloadSchema>;

function secret(): string {
  const s = serverEnv().OAUTH_STATE_SECRET;
  if (!s || s.length < 32) {
    throw new ConfigurationError("OAuth state", "OAUTH_STATE_SECRET must be set (at least 32 characters).");
  }
  return s;
}

export function callbackUrl(platform: PlatformId): string {
  return `${publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/social/${platform}/callback`;
}

export function createPkcePair() {
  const verifier = randomToken(48); // 64 base64url chars (RFC 7636: 43-128)
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function signPayload(payload: OAuthStatePayload, key: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmacSha256(key, body)}`;
}

/** Returns the payload if the signature is valid and not expired, else null. */
export function verifySignedPayload(value: string, key: string, now = Date.now()): OAuthStatePayload | null {
  const [body, sig] = value.split(".");
  if (!body || !sig || !safeEqual(sig, hmacSha256(key, body))) return null;
  try {
    const parsed = payloadSchema.safeParse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
    if (!parsed.success || parsed.data.exp < now) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export async function beginOAuth(params: { platform: PlatformId; orgId: string; userId: string; usesPkce: boolean }) {
  const state = randomToken(24);
  const pkce = params.usesPkce ? createPkcePair() : null;
  const payload: OAuthStatePayload = {
    state,
    codeVerifier: pkce?.verifier ?? null,
    platform: params.platform,
    orgId: params.orgId,
    userId: params.userId,
    exp: Date.now() + TTL_SECONDS * 1000,
  };
  const store = await cookies();
  store.set(cookieName(params.platform), signPayload(payload, secret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/api/social/${params.platform}/callback`,
    maxAge: TTL_SECONDS,
  });
  return { state, codeChallenge: pkce?.challenge };
}

/** Reads, verifies and deletes the state cookie. Returns null on any mismatch. */
export async function consumeOAuthState(platform: PlatformId, returnedState: string | null): Promise<OAuthStatePayload | null> {
  const store = await cookies();
  const raw = store.get(cookieName(platform))?.value;
  store.delete({ name: cookieName(platform), path: `/api/social/${platform}/callback` });
  if (!raw || !returnedState) return null;
  const payload = verifySignedPayload(raw, secret());
  if (!payload || payload.platform !== platform || !safeEqual(payload.state, returnedState)) return null;
  return payload;
}
