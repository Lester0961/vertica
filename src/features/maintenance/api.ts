import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { type ApiContext, register } from "@/lib/api/router";
import {
  createMaintenanceRequest,
  getAllMaintenanceRequests,
  getMyMaintenanceRequests,
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
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
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
    const result = await createMaintenanceRequest(parsed.data);
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

export function registerMaintenanceRoutes(): void {
  register("GET", "maintenance/me/requests", listMineHandler);
  register("POST", "maintenance/me/requests", createMineHandler);
  register("GET", "maintenance/requests", listAllHandler);
}
