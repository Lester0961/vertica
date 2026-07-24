import { createClient } from "@/lib/supabase/server";
import { ALL_ROLES, isRole, type Role } from "@/lib/security/roles";

export interface Actor {
  userId: string;
  email: string | null;
  roles: Role[];
}

/**
 * Shared role-resolution source of truth.
 *
 * SECURITY: Authorization is based on `getClaims()`, which validates the JWT
 * signature locally against the project's public keys. `getSession()` is NEVER
 * used for authorization because it reads raw, spoofable cookie storage.
 *
 * Returns the authenticated actor with resolved roles, or `null` when there is
 * no valid identity.
 */
export async function authenticate(): Promise<Actor | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const claims = data.claims;
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  if (!userId) return null;

  const email = typeof claims.email === "string" ? claims.email : null;

  // Resolve roles from the database (RLS-scoped to the current user).
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = (roleRows ?? [])
    .map((r: { role: string }) => r.role)
    .filter(isRole);

  return { userId, email, roles: roles as Role[] };
}

/**
 * Require an authenticated actor holding at least one of the allowed roles.
 * Throws an `AuthorizationError` describing the precise failure so callers can
 * map it to 401 vs 403.
 */
export class AuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireRole(allowed: Role[] = ALL_ROLES): Promise<Actor> {
  const actor = await authenticate();
  if (!actor) throw new AuthorizationError(401, "Authentication required.");
  if (!actor.roles.some((r) => allowed.includes(r))) {
    throw new AuthorizationError(403, "Insufficient permissions.");
  }
  return actor;
}
