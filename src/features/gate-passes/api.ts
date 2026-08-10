import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { type ApiContext, register } from "@/lib/api/router";
import { requireRole } from "@/lib/security/authenticate";
import { ROLES } from "@/lib/security/roles";
import {
  getMyGatePasses,
  createGatePass,
  revokeGatePass,
  getAllGatePasses,
  verifyGatePass,
  getRecentVerifications,
  revokeGatePassAsStaff,
} from "@/features/gate-passes/queries";

async function listMineHandler() {
  try {
    return ok({ passes: await getMyGatePasses() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

const createSchema = z.object({
  unitId: z.string().uuid(),
  validFrom: z.string(),
  validTo: z.string(),
  maxUses: z.number().int().min(1).max(100).optional(),
  visitors: z.array(
    z.object({
      visitorName: z.string().min(1).max(100),
      vehiclePlate: z.string().max(20).optional(),
    }),
  ).min(1).max(10),
}).superRefine((value, ctx) => {
  const from = Date.parse(value.validFrom);
  const to = Date.parse(value.validTo);
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    ctx.addIssue({ code: "custom", path: ["validFrom"], message: "Use valid dates." });
  } else if (to <= from) {
    ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid-to must be after valid-from." });
  }
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
    const result = await createGatePass(parsed.data);
    return ok(result);
  } catch (e) {
    return fail("INTERNAL", (e as Error).message);
  }
}

async function revokeMineHandler(ctx: ApiContext) {
  const passId = ctx.params?.id;
  if (!passId) return fail("BAD_REQUEST", "Missing pass id.");
  try {
    await revokeGatePass(passId);
    return ok({ revoked: true });
  } catch (e) {
    return fail("INTERNAL", (e as Error).message);
  }
}

async function listAllHandler() {
  try {
    return ok({ passes: await getAllGatePasses() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

const verifySchema = z.object({
  code: z.string().min(6).max(6),
  eventType: z.enum(["ENTRY", "EXIT"]),
});

async function verifyHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid request.", { issues: parsed.error.issues });
  try {
    const actor = await requireRole([ROLES.GUARD, ROLES.SUPER_ADMIN, ROLES.PROPERTY_ADMIN]);
    const result = await verifyGatePass(parsed.data.code, actor.userId, parsed.data.eventType);
    return ok(result);
  } catch (e) {
    const message = (e as Error).message;
    return fail(message === "Authentication required." || message === "Insufficient permissions." ? "FORBIDDEN" : "INTERNAL", message);
  }
}

async function revokeStaffHandler(ctx: ApiContext) {
  let body: unknown; try { body = await ctx.req.json(); } catch { return fail("BAD_REQUEST", "Invalid JSON body."); }
  const parsed = z.object({ reason: z.string().trim().min(3).max(500) }).safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Enter a revocation reason.");
  try { await revokeGatePassAsStaff(ctx.params.id!, parsed.data.reason); return ok({ revoked: true }); } catch (error) { return fail("STATE_CONFLICT", (error as Error).message); }
}

async function recentVerificationsHandler() {
  try {
    return ok({ verifications: await getRecentVerifications() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

export function registerGatePassRoutes(): void {
  register("GET", "gate-passes/mine", listMineHandler);
  register("POST", "gate-passes/mine", createMineHandler);
  register("POST", "gate-passes/mine/:id/revoke", revokeMineHandler);
  register("GET", "gate-passes", listAllHandler);
  register("POST", "gate-passes/:id/revoke", revokeStaffHandler);
  register("POST", "gate-passes/verify", verifyHandler);
  register("GET", "gate-passes/verifications", recentVerificationsHandler);
}
