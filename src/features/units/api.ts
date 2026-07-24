import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { register, type ApiContext } from "@/lib/api/router";
import { getPropertySummary, getUnitTypes } from "@/features/property/queries";
import {
  getPublicUnitByLabel,
  getUnitsByLabels,
  listPublicUnits,
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
  register("GET", "public/units/:publicLabel", getHandler);
  register("POST", "compare", compareHandler);
}
