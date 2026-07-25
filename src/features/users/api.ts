import { ok, fail } from "@/lib/api/response";
import { register } from "@/lib/api/router";
import {
  getAllUsers,
  getAuditLogs,
  getMyProfile,
  updateMyProfile,
  getMyNotifications,
  markNotificationRead,
} from "@/features/users/queries";

async function listUsersHandler() {
  try {
    return ok({ users: await getAllUsers() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function auditLogsHandler() {
  try {
    return ok({ logs: await getAuditLogs() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function myProfileHandler() {
  try {
    return ok(await getMyProfile());
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function updateProfileHandler(ctx: import("@/lib/api/router").ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  try {
    await updateMyProfile(body as { displayName?: string; phone?: string });
    return ok({ updated: true });
  } catch (e) {
    return fail("INTERNAL", (e as Error).message);
  }
}

async function myNotificationsHandler() {
  try {
    return ok({ notifications: await getMyNotifications() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function markReadHandler(ctx: import("@/lib/api/router").ApiContext) {
  const id = ctx.params?.id;
  if (!id) return fail("BAD_REQUEST", "Missing notification id.");
  try {
    await markNotificationRead(id);
    return ok({ read: true });
  } catch (e) {
    return fail("INTERNAL", (e as Error).message);
  }
}

export function registerUserRoutes(): void {
  register("GET", "users", listUsersHandler);
  register("GET", "audit-logs", auditLogsHandler);
  register("GET", "profile/me", myProfileHandler);
  register("PATCH", "profile/me", updateProfileHandler);
  register("GET", "notifications/me", myNotificationsHandler);
  register("POST", "notifications/me/:id/read", markReadHandler);
}
