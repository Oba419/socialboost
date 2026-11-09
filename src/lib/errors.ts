/**
 * Typed application errors. Route handlers and server actions convert these
 * into the standard API error shape; unknown errors become a generic 500 with
 * no internal details leaked to the client.
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "PLAN_REQUIRED"
  | "QUOTA_EXCEEDED"
  | "NOT_CONFIGURED"
  | "CONFLICT"
  | "PROVIDER_ERROR"
  | "AI_OUTPUT_INVALID"
  | "ACCOUNT_SUSPENDED"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  PLAN_REQUIRED: 402,
  QUOTA_EXCEEDED: 402,
  NOT_CONFIGURED: 503,
  CONFLICT: 409,
  PROVIDER_ERROR: 502,
  AI_OUTPUT_INVALID: 502,
  ACCOUNT_SUSPENDED: 403,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
