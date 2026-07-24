/**
 * Canonical role dictionary for Vertica.
 *
 * Six access categories exist. GUEST is the implicit unauthenticated category
 * and is never stored in `user_roles`.
 */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PROPERTY_ADMIN: "PROPERTY_ADMIN",
  TENANT: "TENANT",
  GUARD: "GUARD",
  MAINTENANCE: "MAINTENANCE",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);

export type Category = Role | "GUEST";

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ALL_ROLES as string[]).includes(value);
}

/**
 * Home-route precedence for multi-role users. Higher precedence wins when
 * choosing the default landing portal. Documented per blueprint DB-02.
 */
const HOME_PRECEDENCE: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.PROPERTY_ADMIN,
  ROLES.MAINTENANCE,
  ROLES.GUARD,
  ROLES.TENANT,
];

const HOME_ROUTE: Record<Role, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  PROPERTY_ADMIN: "/admin/dashboard",
  MAINTENANCE: "/maintenance/assigned",
  GUARD: "/guard/verify",
  TENANT: "/tenant/dashboard",
};

/** Resolve the default home route for a set of roles. */
export function resolveHomeRoute(roles: Role[]): string {
  for (const role of HOME_PRECEDENCE) {
    if (roles.includes(role)) return HOME_ROUTE[role];
  }
  return "/";
}

/** Whether the given roles satisfy at least one of the allowed roles. */
export function hasAnyRole(roles: Role[], allowed: Role[]): boolean {
  return roles.some((r) => allowed.includes(r));
}
