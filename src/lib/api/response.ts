/**
 * Standard API envelope shared by route handlers, server actions and clients.
 *   success: { ok: true, data }
 *   failure: { ok: false, error: { code, message, details? } }
 */
import type { ErrorCode } from "@/lib/errors";

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: ErrorCode; message: string; details?: Record<string, unknown> };
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginate<T>(items: T[], page: number, pageSize: number, total: number): Paginated<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
