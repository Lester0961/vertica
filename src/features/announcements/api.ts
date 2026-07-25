import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { type ApiContext, register } from "@/lib/api/router";
import {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/features/announcements/queries";

async function listActiveHandler() {
  try {
    return ok({ announcements: await getActiveAnnouncements() });
  } catch (e) {
    return fail("INTERNAL", (e as Error).message);
  }
}

async function listAllHandler() {
  try {
    return ok({ announcements: await getAllAnnouncements() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  audience: z.enum(["ALL", "TENANTS", "STAFF"]),
  priority: z.enum(["NORMAL", "URGENT"]),
  publishedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

async function createHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid request.", { issues: parsed.error.issues });
  try {
    const result = await createAnnouncement(parsed.data);
    return ok(result);
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function updateHandler(ctx: ApiContext) {
  const id = ctx.params?.id;
  if (!id) return fail("BAD_REQUEST", "Missing announcement id.");
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid request.", { issues: parsed.error.issues });
  try {
    await updateAnnouncement(id, parsed.data);
    return ok({ updated: true });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function deleteHandler(ctx: ApiContext) {
  const id = ctx.params?.id;
  if (!id) return fail("BAD_REQUEST", "Missing announcement id.");
  try {
    await deleteAnnouncement(id);
    return ok({ deleted: true });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

export function registerAnnouncementRoutes(): void {
  register("GET", "announcements/active", listActiveHandler);
  register("GET", "announcements", listAllHandler);
  register("POST", "announcements", createHandler);
  register("PATCH", "announcements/:id", updateHandler);
  register("DELETE", "announcements/:id", deleteHandler);
}
