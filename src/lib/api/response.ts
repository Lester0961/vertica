import { NextResponse } from "next/server";

export const API_VERSION = "2.0.0";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "STATE_CONFLICT"
  | "UNPROCESSABLE"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "UNAVAILABLE";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  STATE_CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
};

function requestId(): string {
  return crypto.randomUUID();
}

function meta(id = requestId()) {
  return { requestId: id, version: API_VERSION };
}

export function ok<T>(data: T, init?: { status?: number; requestId?: string }) {
  return NextResponse.json(
    { data, meta: meta(init?.requestId) },
    { status: init?.status ?? 200, headers: { "Cache-Control": "private, no-store" } },
  );
}

export function fail(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  reqId?: string,
) {
  return NextResponse.json(
    { error: { code, message, details: details ?? {} }, meta: meta(reqId) },
    { status: STATUS_BY_CODE[code], headers: { "Cache-Control": "private, no-store" } },
  );
}
