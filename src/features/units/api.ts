import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { register, type ApiContext } from "@/lib/api/router";
import { getPropertySummary, getUnitTypes } from "@/features/property/queries";
import {
  getPublicUnitByLabel,
  getAdminUnitOptions,
  createAdminUnit,
  updateAdminUnitDetails,
  getUnitsByLabels,
  listAdminUnits,
  listPublicUnits,
  updateAdminUnitStatus,
  type UnitFilters,
} from "@/features/units/queries";

function num(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

const SORTS = ["rent_asc", "rent_desc", "area_asc", "area_desc", "floor_asc", "available_asc"] as const;

function parseFilters(q: URLSearchParams): UnitFilters {
  const sort = q.get("sort");
  return {
    type: q.get("type") ?? undefined,
    minRent: num(q.get("minRent")),
    maxRent: num(q.get("maxRent")),
    minArea: num(q.get("minArea")),
    maxArea: num(q.get("maxArea")),
    floor: num(q.get("floor")),
    furnishing: q.get("furnishing") ?? undefined,
    moveInBy: q.get("moveInBy") ?? undefined,
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as UnitFilters["sort"]) : undefined,
    limit: num(q.get("limit")),
  };
}

async function listHandler(ctx: ApiContext) {
  const units = await listPublicUnits(parseFilters(ctx.query));
  return ok({ units, count: units.length });
}

async function getHandler(ctx: ApiContext) {
  const unit = await getPublicUnitByLabel(ctx.params.publicLabel!);
  if (!unit) return fail("NOT_FOUND", "Unit not found or not available.");
  return ok({ unit });
}

async function propertyHandler() {
  return ok({ property: await getPropertySummary() });
}

async function unitTypesHandler() {
  return ok({ unitTypes: await getUnitTypes() });
}

async function adminListHandler() {
  try {
    const units = await listAdminUnits();
    return ok({ units, count: units.length });
  } catch (error) {
    return fail("FORBIDDEN", (error as Error).message);
  }
}

async function adminOptionsHandler() {
  try { return ok(await getAdminUnitOptions()); } catch (error) { return fail("FORBIDDEN", (error as Error).message); }
}

const unitInputSchema = z.object({
  buildingId: z.uuid(), floorId: z.uuid(), unitTypeId: z.uuid(), unitNumber: z.string().trim().min(1).max(20), publicLabel: z.string().trim().min(1).max(40),
  areaSqm: z.number().positive(), monthlyRent: z.number().nonnegative(), monthlyDues: z.number().nonnegative(), availableFrom: z.iso.date().nullable().optional(), minLeaseMonths: z.number().int().positive(),
  status: z.enum(["DRAFT", "AVAILABLE", "RESERVED", "MAINTENANCE", "UNAVAILABLE", "OCCUPIED"]), isPublic: z.boolean(), furnishing: z.enum(["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"]).nullable().optional(), capacity: z.number().int().positive().nullable().optional(), orientation: z.string().max(80).nullable().optional(), expectedVersion: z.number().int().positive().optional(),
});

async function adminCreateHandler(ctx: ApiContext) {
  let body: unknown; try { body = await ctx.req.json(); } catch { return fail("BAD_REQUEST", "Invalid JSON body."); }
  const parsed = unitInputSchema.omit({ expectedVersion: true }).safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Complete the required unit details.", { issues: parsed.error.issues });
  try { return ok({ unit: await createAdminUnit(parsed.data) }); } catch (error) { return fail("UNPROCESSABLE", (error as Error).message); }
}

async function adminDetailsHandler(ctx: ApiContext) {
  let body: unknown; try { body = await ctx.req.json(); } catch { return fail("BAD_REQUEST", "Invalid JSON body."); }
  const parsed = unitInputSchema.required({ expectedVersion: true }).safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Complete the required unit details.", { issues: parsed.error.issues });
  const { expectedVersion, ...input } = parsed.data;
  try { return ok({ unit: await updateAdminUnitDetails(ctx.params.id!, input, expectedVersion) }); } catch (error) { return fail("STATE_CONFLICT", (error as Error).message); }
}

const updateStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "RESERVED", "MAINTENANCE", "UNAVAILABLE"]),
  reason: z.string().trim().min(3).max(500),
});

async function adminUpdateHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "A status and reason are required.", { issues: parsed.error.issues });
  try {
    return ok({ unit: await updateAdminUnitStatus(ctx.params.id!, parsed.data.status, parsed.data.reason) });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message.includes("elsewhere") ? "STATE_CONFLICT" : "UNPROCESSABLE", message);
  }
}

const compareSchema = z.object({
  labels: z.array(z.string().min(1)).min(1).max(3),
});

async function compareHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = compareSchema.safeParse(body);
  if (!parsed.success) {
    return fail("BAD_REQUEST", "Provide 1 to 3 unit labels.", {
      issues: parsed.error.issues,
    });
  }
  const units = await getUnitsByLabels(parsed.data.labels);
  return ok({ units });
}

export function registerUnitRoutes(): void {
  register("GET", "public/property", propertyHandler);
  register("GET", "public/unit-types", unitTypesHandler);
  register("GET", "public/units", listHandler);
  register("GET", "admin/units", adminListHandler);
  register("GET", "admin/units/options", adminOptionsHandler);
  register("POST", "admin/units", adminCreateHandler);
  register("PATCH", "admin/units/:id", adminUpdateHandler);
  register("PATCH", "admin/units/:id/details", adminDetailsHandler);
  register("GET", "public/units/:publicLabel", getHandler);
  register("POST", "compare", compareHandler);
}
