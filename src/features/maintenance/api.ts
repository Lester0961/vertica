import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { type ApiContext, register } from "@/lib/api/router";
import {
  createMaintenanceRequest,
  getAllMaintenanceRequests,
  getMyMaintenanceRequests,
  updateMaintenanceStatus,
} from "@/features/maintenance/queries";

async function listMineHandler() {
  try {
    return ok({ requests: await getMyMaintenanceRequests() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

const createSchema = z.object({
  category: z.enum(["PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL", "PEST", "OTHER"]),
  priority: z.enum(["LOW", "NORMAL", "MEDIUM", "HIGH", "EMERGENCY", "URGENT"]),
  description: z.string().min(10).max(2000),
  isSafety: z.boolean().default(false),
  preferredSchedule: z
    .object({
      date: z.string().optional(),
      time: z.string().optional(),
    })
    .optional(),
});

async function createMineHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid request.", { issues: parsed.error.issues });
  try {
    const priority = parsed.data.priority === "MEDIUM"
      ? "NORMAL"
      : parsed.data.priority === "URGENT"
        ? "EMERGENCY"
        : parsed.data.priority;
    const result = await createMaintenanceRequest({ ...parsed.data, priority });
    return ok(result);
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function listAllHandler() {
  try {
    return ok({ requests: await getAllMaintenanceRequests() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

const updateStatusSchema = z.object({
  status: z.enum(["TRIAGED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CLOSED", "REJECTED", "CANCELLED"]),
  reason: z.string().trim().min(3).max(2000),
});

async function updateStatusHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "A valid status and reason are required.", { issues: parsed.error.issues });
  try {
    return ok({ request: await updateMaintenanceStatus(ctx.params.id!, parsed.data.status, parsed.data.reason) });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message.includes("elsewhere") ? "STATE_CONFLICT" : "UNPROCESSABLE", message);
  }
}

export function registerMaintenanceRoutes(): void {
  register("GET", "maintenance/me/requests", listMineHandler);
  register("POST", "maintenance/me/requests", createMineHandler);
  register("GET", "maintenance/requests", listAllHandler);
  register("PATCH", "maintenance/requests/:id", updateStatusHandler);
}
