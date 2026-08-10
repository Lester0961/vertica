import { fail, ok } from "@/lib/api/response";
import { register } from "@/lib/api/router";
import { requireRole } from "@/lib/security/authenticate";
import { ROLES } from "@/lib/security/roles";
import { getActiveLeases, getClients, getInquiries, getMyActiveLease, getReservationRequests, getTenants } from "@/features/staff/queries";
import { z } from "zod";
import type { ApiContext } from "@/lib/api/router";
import { decideReservationRequest, renewLease, terminateLease, updateClientRecord, updateInquiryRecord, updateTenantRecord } from "@/features/staff/mutations";

async function activeLeasesHandler() {
  try {
    await requireRole([ROLES.SUPER_ADMIN, ROLES.PROPERTY_ADMIN]);
    return ok({ leases: await getActiveLeases() });
  } catch (error) {
    return fail("FORBIDDEN", (error as Error).message);
  }
}

async function inquiriesHandler() {
  try {
    await requireRole([ROLES.SUPER_ADMIN, ROLES.PROPERTY_ADMIN]);
    return ok({ inquiries: await getInquiries() });
  } catch (error) {
    return fail("FORBIDDEN", (error as Error).message);
  }
}

async function myLeaseHandler() {
  try {
    return ok({ lease: await getMyActiveLease() });
  } catch (error) {
    return fail("FORBIDDEN", (error as Error).message);
  }
}

async function clientsHandler() { try { await requireRole([ROLES.SUPER_ADMIN, ROLES.PROPERTY_ADMIN]); return ok({ clients: await getClients() }); } catch (error) { return fail("FORBIDDEN", (error as Error).message); } }
async function tenantsHandler() { try { await requireRole([ROLES.SUPER_ADMIN, ROLES.PROPERTY_ADMIN]); return ok({ tenants: await getTenants() }); } catch (error) { return fail("FORBIDDEN", (error as Error).message); } }
async function reservationsHandler() { try { await requireRole([ROLES.SUPER_ADMIN, ROLES.PROPERTY_ADMIN]); return ok({ reservations: await getReservationRequests() }); } catch (error) { return fail("FORBIDDEN", (error as Error).message); } }

async function readBody(ctx: ApiContext): Promise<unknown> {
  try { return await ctx.req.json(); } catch { return null; }
}

const clientSchema = z.object({ fullName: z.string().trim().min(2).max(120), email: z.string().email().nullable().optional(), phone: z.string().max(40).nullable().optional(), archived: z.boolean().optional() });
async function updateClientHandler(ctx: ApiContext) {
  const parsed = clientSchema.safeParse(await readBody(ctx));
  if (!parsed.success) return fail("BAD_REQUEST", "Enter a valid client record.", { issues: parsed.error.issues });
  try { return ok({ client: await updateClientRecord(ctx.params.id!, parsed.data) }); } catch (error) { return fail("UNPROCESSABLE", (error as Error).message); }
}

const inquirySchema = z.object({ status: z.enum(["NEW", "CONTACTED", "FOLLOW_UP", "QUALIFIED", "CONVERTED", "CLOSED_LOST"]), reason: z.string().trim().min(3).max(500), nextAction: z.string().max(500).nullable().optional(), nextActionAt: z.iso.date().nullable().optional() });
async function updateInquiryHandler(ctx: ApiContext) {
  const parsed = inquirySchema.safeParse(await readBody(ctx));
  if (!parsed.success) return fail("BAD_REQUEST", "Choose a valid inquiry status and reason.", { issues: parsed.error.issues });
  try { return ok({ inquiry: await updateInquiryRecord(ctx.params.id!, parsed.data) }); } catch (error) { return fail("STATE_CONFLICT", (error as Error).message); }
}

const reservationDecisionSchema = z.object({ decision: z.enum(["APPROVED", "REJECTED", "CANCELLED"]), reason: z.string().trim().min(3).max(500) });
async function decideReservationHandler(ctx: ApiContext) {
  const parsed = reservationDecisionSchema.safeParse(await readBody(ctx));
  if (!parsed.success) return fail("BAD_REQUEST", "Choose a decision and enter a reason.", { issues: parsed.error.issues });
  try { return ok({ reservation: await decideReservationRequest(ctx.params.id!, parsed.data) }); } catch (error) { return fail("STATE_CONFLICT", (error as Error).message); }
}

const tenantSchema = z.object({ status: z.enum(["PENDING", "ACTIVE", "INACTIVE"]) });
async function updateTenantHandler(ctx: ApiContext) {
  const parsed = tenantSchema.safeParse(await readBody(ctx));
  if (!parsed.success) return fail("BAD_REQUEST", "Choose a valid tenant status.");
  try { return ok({ tenant: await updateTenantRecord(ctx.params.id!, parsed.data) }); } catch (error) { return fail("STATE_CONFLICT", (error as Error).message); }
}

async function terminateLeaseHandler(ctx: ApiContext) {
  const parsed = z.object({ reason: z.string().trim().min(3).max(500) }).safeParse(await readBody(ctx));
  if (!parsed.success) return fail("BAD_REQUEST", "Enter a termination reason.");
  try { return ok({ lease: await terminateLease(ctx.params.id!, parsed.data.reason) }); } catch (error) { return fail("STATE_CONFLICT", (error as Error).message); }
}

const renewalSchema = z.object({ startDate: z.iso.date(), endDate: z.iso.date(), monthlyRent: z.number().positive(), advanceAmount: z.number().nonnegative(), depositAmount: z.number().nonnegative() });
async function renewLeaseHandler(ctx: ApiContext) {
  const parsed = renewalSchema.safeParse(await readBody(ctx));
  if (!parsed.success) return fail("BAD_REQUEST", "Complete the renewal dates and amounts.", { issues: parsed.error.issues });
  try { return ok({ lease: await renewLease(ctx.params.id!, parsed.data) }); } catch (error) { return fail("UNPROCESSABLE", (error as Error).message); }
}

export function registerStaffRoutes(): void {
  register("GET", "leases/active", activeLeasesHandler);
  register("GET", "inquiries", inquiriesHandler);
  register("GET", "leases/me", myLeaseHandler);
  register("GET", "clients", clientsHandler);
  register("GET", "tenants", tenantsHandler);
  register("GET", "reservations", reservationsHandler);
  register("PATCH", "clients/:id", updateClientHandler);
  register("PATCH", "inquiries/:id", updateInquiryHandler);
  register("POST", "reservations/:id/decision", decideReservationHandler);
  register("PATCH", "tenants/:id", updateTenantHandler);
  register("POST", "leases/:id/terminate", terminateLeaseHandler);
  register("POST", "leases/:id/renew", renewLeaseHandler);
}
