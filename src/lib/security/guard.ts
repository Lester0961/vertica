import { redirect } from "next/navigation";
import { authenticate, type Actor } from "@/lib/security/authenticate";
import { type Role } from "@/lib/security/roles";

/**
 * Server-Component page/layout guard. Independently requires an authenticated
 * actor (via getClaims-backed `authenticate()`) holding at least one allowed
 * role, then returns the actor. Redirects to /login (or /access-denied) when
 * authorization fails. Never trust the proxy alone for authorization.
 */
export async function requirePageRole(
  allowed: Role[],
  redirectTo?: string,
): Promise<Actor> {
  const actor = await authenticate();
  console.error("[guard] allowed=", JSON.stringify(allowed), "actor=", actor ? JSON.stringify(actor.roles) : "null");
  if (!actor) {
    console.error("[guard] -> redirect /login");
    redirect(redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login");
  }
  if (!actor.roles.some((r) => allowed.includes(r))) {
    console.error("[guard] -> redirect /access-denied");
    redirect("/access-denied");
  }
  return actor;
}
