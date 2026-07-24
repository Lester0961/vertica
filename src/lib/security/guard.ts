import { redirect } from "next/navigation";
import { authenticate, type Actor } from "@/lib/security/authenticate";
import { type Role } from "@/lib/security/roles";

/**
 * Server-Component page guard. Independently requires an authenticated actor
 * (via getClaims-backed `authenticate()`) holding at least one allowed role.
 *
 * Redirects to /login when unauthenticated, or /access-denied when the actor
 * lacks the required role. Never trust the proxy alone for authorization.
 */
export async function requirePageRole(
  allowed: Role[],
  redirectTo?: string,
): Promise<Actor> {
  const actor = await authenticate();
  if (!actor) {
    const target = redirectTo
      ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
      : "/login";
    redirect(target);
  }
  if (!actor.roles.some((r) => allowed.includes(r))) {
    redirect("/access-denied");
  }
  return actor;
}
