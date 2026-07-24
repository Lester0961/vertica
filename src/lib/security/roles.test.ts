import { describe, it, expect } from "vitest";
import { resolveHomeRoute, hasAnyRole, isRole, ROLES } from "./roles";

describe("roles", () => {
  it("isRole validates known roles", () => {
    expect(isRole("SUPER_ADMIN")).toBe(true);
    expect(isRole("GUEST")).toBe(false);
    expect(isRole(123)).toBe(false);
  });

  it("resolveHomeRoute honors precedence for multi-role users", () => {
    expect(resolveHomeRoute([ROLES.TENANT])).toBe("/tenant/dashboard");
    expect(resolveHomeRoute([ROLES.GUARD])).toBe("/guard/verify");
    expect(resolveHomeRoute([ROLES.MAINTENANCE])).toBe("/maintenance/assigned");
    expect(resolveHomeRoute([ROLES.PROPERTY_ADMIN])).toBe("/admin/dashboard");
    // Super admin outranks tenant.
    expect(resolveHomeRoute([ROLES.TENANT, ROLES.SUPER_ADMIN])).toBe(
      "/admin/dashboard",
    );
    // Admin outranks guard/maintenance.
    expect(resolveHomeRoute([ROLES.GUARD, ROLES.PROPERTY_ADMIN])).toBe(
      "/admin/dashboard",
    );
    // No roles -> public home.
    expect(resolveHomeRoute([])).toBe("/");
  });

  it("hasAnyRole checks intersection", () => {
    expect(hasAnyRole([ROLES.TENANT], [ROLES.TENANT, ROLES.GUARD])).toBe(true);
    expect(hasAnyRole([ROLES.TENANT], [ROLES.SUPER_ADMIN])).toBe(false);
  });
});
