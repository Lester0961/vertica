import type { NextRequest } from "next/server";
import { fail } from "@/lib/api/response";
import { AuthorizationError } from "@/lib/security/authenticate";

export interface ApiContext {
  req: NextRequest;
  params: Record<string, string>;
  query: URLSearchParams;
}

export type ApiHandler = (ctx: ApiContext) => Promise<Response> | Response;

interface Route {
  method: string;
  parts: string[];
  handler: ApiHandler;
}

const routes: Route[] = [];

/** Register a route. Pattern uses `:name` for dynamic segments. */
export function register(method: string, pattern: string, handler: ApiHandler): void {
  routes.push({
    method: method.toUpperCase(),
    parts: pattern.split("/").filter(Boolean),
    handler,
  });
}

function match(method: string, segments: string[]): { handler: ApiHandler; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.parts.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < route.parts.length; i++) {
      const p = route.parts[i]!;
      const s = segments[i]!;
      if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(s);
      else if (p !== s) {
        ok = false;
        break;
      }
    }
    if (ok) return { handler: route.handler, params };
  }
  return null;
}

/** Dispatch a request to a registered handler, mapping known errors. */
export async function dispatch(req: NextRequest, segments: string[]): Promise<Response> {
  const found = match(req.method, segments);
  if (!found) {
    return fail("NOT_FOUND", `No API contract registered for ${req.method} /${segments.join("/")}.`);
  }
  try {
    return await found.handler({
      req,
      params: found.params,
      query: req.nextUrl.searchParams,
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return fail(err.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", err.message);
    }
    console.error("[api] unhandled error", err);
    return fail("INTERNAL", "An unexpected server error occurred.");
  }
}
