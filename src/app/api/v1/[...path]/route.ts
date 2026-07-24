import type { NextRequest } from "next/server";
import { fail } from "@/lib/api/response";
import { AuthorizationError } from "@/lib/security/authenticate";

/**
 * Versioned API boundary: /api/v1/[...path]
 *
 * This is the single stable version boundary for all API contracts. Individual
 * operations are dispatched by the router (added in later phases). During
 * Phase 0 the router is empty and every path returns a well-formed 404 so the
 * error envelope and status mapping can be verified.
 */
async function handle(
  _request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await ctx.params;
    const route = path.join("/");
    return fail("NOT_FOUND", `No API contract registered for /${route}.`);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return fail(
        err.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
        err.message,
      );
    }
    return fail("INTERNAL", "An unexpected server error occurred.");
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
