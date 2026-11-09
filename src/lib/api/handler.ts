import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AppError, isAppError } from "@/lib/errors";
import { ConfigurationError } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { ApiFailure, ApiResult } from "./response";

/** Convert any thrown value into a safe API failure (no internals leaked). */
export function toApiFailure(error: unknown): { body: ApiFailure; status: number } {
  if (isAppError(error)) {
    return {
      status: error.status,
      body: { ok: false, error: { code: error.code, message: error.message, details: error.details } },
    };
  }
  if (error instanceof ConfigurationError) {
    return { status: 503, body: { ok: false, error: { code: "NOT_CONFIGURED", message: error.message } } };
  }
  if (error instanceof z.ZodError) {
    return {
      status: 422,
      body: {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "Invalid input.",
          details: { issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
        },
      },
    };
  }
  logger.error("Unhandled error", error);
  return {
    status: 500,
    body: { ok: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
  };
}

type Handler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<unknown>;

/**
 * Wrap a route handler: returns `{ ok: true, data }` with the handler's
 * result, or the standard error envelope with the right status code.
 */
export function route<Ctx = { params: Promise<Record<string, string>> }>(handler: Handler<Ctx>) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      const result = await handler(req, ctx);
      if (result instanceof Response) return result;
      return NextResponse.json({ ok: true, data: result ?? null } satisfies ApiResult<unknown>);
    } catch (error) {
      const { body, status } = toApiFailure(error);
      return NextResponse.json(body, { status });
    }
  };
}

/** Parse and validate a JSON body. */
export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
  return schema.parse(raw);
}

export function parseQuery<T extends z.ZodType>(req: NextRequest, schema: T): z.infer<T> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

/**
 * Same-origin check for state-changing JSON requests. Browsers always send
 * Origin on cross-site POSTs, so rejecting foreign origins blocks CSRF even
 * though our cookies are already SameSite=Lax.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients / same-origin navigations
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new AppError("FORBIDDEN", "Cross-origin request rejected.");
  } catch (e) {
    if (isAppError(e)) throw e;
    throw new AppError("FORBIDDEN", "Invalid origin.");
  }
}

/** Wrap a server action so it returns ApiResult instead of throwing. */
export async function action<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    // Let Next.js redirect()/notFound() propagate.
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_")) {
      throw error;
    }
    return toApiFailure(error).body;
  }
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
