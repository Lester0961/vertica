import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { authenticate, AuthorizationError } from "@/lib/security/authenticate";

export interface UnitFilters {
  type?: string; // unit_type code
  minRent?: number;
  maxRent?: number;
  minArea?: number;
  maxArea?: number;
  floor?: number;
  furnishing?: string;
  moveInBy?: string; // ISO date
  sort?: "rent_asc" | "rent_desc" | "area_asc" | "area_desc" | "floor_asc" | "available_asc";
  limit?: number;
}

export interface UnitListItem {
  id: string;
  publicLabel: string;
  unitTypeCode: string;
  unitTypeName: string;
  bedrooms: number;
  bathrooms: number;
  floorNumber: number;
  floorLabel: string;
  areaSqm: number;
  monthlyRent: number;
  monthlyDues: number;
  capacity: number | null;
  furnishing: string | null;
  availableFrom: string | null;
  unitNumber?: string;
  minLeaseMonths?: number;
  orientation?: string | null;
  isPublic?: boolean;
  statusVersion?: number;
  floorId?: string;
  unitTypeId?: string;
  buildingId?: string;
}

interface UnitRow {
  id: string;
  public_label: string;
  area_sqm: number | string;
  monthly_rent: number | string;
  monthly_dues: number | string;
  capacity: number | null;
  furnishing: string | null;
  available_from: string | null;
  unit_number: string;
  min_lease_months: number;
  orientation: string | null;
  is_public: boolean;
  status_version: number;
  floor_id: string;
  unit_type_id: string;
  building_id: string;
  unit_types: { code: string; name: string; bedrooms: number; bathrooms: number | string } | null;
  floors: { floor_number: number; public_label: string } | null;
}

const SELECT =
  "id, public_label, unit_number, area_sqm, monthly_rent, monthly_dues, capacity, furnishing, available_from, min_lease_months, orientation, is_public, status_version, floor_id, unit_type_id, building_id, " +
  "unit_types!inner(code, name, bedrooms, bathrooms), floors!inner(floor_number, public_label)";

function mapRow(r: UnitRow): UnitListItem {
  return {
    id: r.id,
    publicLabel: r.public_label,
    unitTypeCode: r.unit_types?.code ?? "",
    unitTypeName: r.unit_types?.name ?? "Unit",
    bedrooms: r.unit_types?.bedrooms ?? 0,
    bathrooms: Number(r.unit_types?.bathrooms ?? 0),
    floorNumber: r.floors?.floor_number ?? 0,
    floorLabel: r.floors?.public_label ?? "",
    areaSqm: Number(r.area_sqm),
    monthlyRent: Number(r.monthly_rent),
    monthlyDues: Number(r.monthly_dues),
    capacity: r.capacity,
    furnishing: r.furnishing,
    availableFrom: r.available_from,
    unitNumber: r.unit_number,
    minLeaseMonths: r.min_lease_months,
    orientation: r.orientation,
    isPublic: r.is_public,
    statusVersion: r.status_version,
    floorId: r.floor_id,
    unitTypeId: r.unit_type_id,
    buildingId: r.building_id,
  };
}

export async function listPublicUnits(filters: UnitFilters = {}): Promise<UnitListItem[]> {
  const supabase = await createClient();
  let q = supabase.from("units").select(SELECT).eq("status", "AVAILABLE");

  if (filters.type) q = q.eq("unit_types.code", filters.type);
  if (filters.floor !== undefined) q = q.eq("floors.floor_number", filters.floor);
  if (filters.minRent !== undefined) q = q.gte("monthly_rent", filters.minRent);
  if (filters.maxRent !== undefined) q = q.lte("monthly_rent", filters.maxRent);
  if (filters.minArea !== undefined) q = q.gte("area_sqm", filters.minArea);
  if (filters.maxArea !== undefined) q = q.lte("area_sqm", filters.maxArea);
  if (filters.furnishing) q = q.eq("furnishing", filters.furnishing);
  if (filters.moveInBy) q = q.lte("available_from", filters.moveInBy);

  switch (filters.sort) {
    case "rent_desc": q = q.order("monthly_rent", { ascending: false }); break;
    case "area_asc": q = q.order("area_sqm", { ascending: true }); break;
    case "area_desc": q = q.order("area_sqm", { ascending: false }); break;
    case "available_asc": q = q.order("available_from", { ascending: true, nullsFirst: false }); break;
    case "rent_asc":
    default: q = q.order("monthly_rent", { ascending: true }); break;
  }

  q = q.limit(Math.min(filters.limit ?? 100, 200));

  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as UnitRow[]).map(mapRow);
}

/** Staff inventory view. Unlike the public catalogue, this intentionally includes every unit status. */
export async function listAdminUnits(): Promise<(UnitListItem & { status: string })[]> {
  const actor = await authenticate();
  if (!actor?.roles.some((role) => role === "SUPER_ADMIN" || role === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const { data, error } = await createServiceRoleClient()
    .from("units")
    .select(`${SELECT}, status`)
    .order("public_label");
  if (error) throw new Error("Could not load unit inventory.");
  return ((data ?? []) as unknown as (UnitRow & { status: string })[]).map((row) => ({ ...mapRow(row), status: row.status }));
}

const MANUAL_UNIT_STATUSES = ["AVAILABLE", "RESERVED", "MAINTENANCE", "UNAVAILABLE"] as const;
export type ManualUnitStatus = (typeof MANUAL_UNIT_STATUSES)[number];

export interface UnitAdminInput {
  buildingId: string;
  floorId: string;
  unitTypeId: string;
  unitNumber: string;
  publicLabel: string;
  areaSqm: number;
  monthlyRent: number;
  monthlyDues: number;
  availableFrom?: string | null;
  minLeaseMonths: number;
  status: ManualUnitStatus | "DRAFT" | "OCCUPIED";
  isPublic: boolean;
  furnishing?: "UNFURNISHED" | "SEMI_FURNISHED" | "FURNISHED" | null;
  capacity?: number | null;
  orientation?: string | null;
}

export async function getAdminUnitOptions() {
  const actor = await authenticate();
  if (!actor?.roles.some((role) => role === "SUPER_ADMIN" || role === "PROPERTY_ADMIN")) throw new AuthorizationError(403, "Admin access only.");
  const supabase = createServiceRoleClient();
  const [{ data: buildings, error: buildingError }, { data: floors, error: floorError }, { data: unitTypes, error: typeError }] = await Promise.all([
    supabase.from("buildings").select("id, name").eq("status", "ACTIVE").order("name"),
    supabase.from("floors").select("id, building_id, floor_number, public_label").order("sort_order"),
    supabase.from("unit_types").select("id, code, name, base_area_sqm, capacity, default_dues").order("name"),
  ]);
  if (buildingError || floorError || typeError) throw new Error("Could not load unit form options.");
  return { buildings: buildings ?? [], floors: floors ?? [], unitTypes: unitTypes ?? [] };
}

async function requireInventoryAdmin() {
  const actor = await authenticate();
  if (!actor?.roles.some((role) => role === "SUPER_ADMIN" || role === "PROPERTY_ADMIN")) throw new AuthorizationError(403, "Admin access only.");
  return actor;
}

function unitPayload(input: UnitAdminInput) {
  return {
    building_id: input.buildingId,
    floor_id: input.floorId,
    unit_type_id: input.unitTypeId,
    unit_number: input.unitNumber.trim(),
    public_label: input.publicLabel.trim(),
    area_sqm: input.areaSqm,
    monthly_rent: input.monthlyRent,
    monthly_dues: input.monthlyDues,
    available_from: input.availableFrom || null,
    min_lease_months: input.minLeaseMonths,
    status: input.status,
    is_public: input.isPublic,
    furnishing: input.furnishing || null,
    capacity: input.capacity || null,
    orientation: input.orientation?.trim() || null,
  };
}

export async function createAdminUnit(input: UnitAdminInput) {
  const actor = await requireInventoryAdmin();
  if (input.status === "OCCUPIED") throw new Error("Create a lease to mark a unit occupied.");
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("units").insert(unitPayload(input)).select(`${SELECT}, status`).maybeSingle();
  if (error || !data) throw new Error(error?.message.includes("duplicate") ? "That unit number or public label already exists." : "Unit could not be created.");
  await supabase.from("unit_status_events").insert({ unit_id: data.id, next_status: data.status, source_entity: "ADMIN_UI", actor_id: actor.userId, reason: "Unit created" });
  return { ...mapRow(data as unknown as UnitRow), status: data.status };
}

export async function updateAdminUnitDetails(unitId: string, input: UnitAdminInput, expectedVersion: number) {
  await requireInventoryAdmin();
  const supabase = createServiceRoleClient();
  const { data: current } = await supabase.from("units").select("id, status, status_version").eq("id", unitId).maybeSingle();
  if (!current) throw new Error("Unit not found.");
  if (current.status === "OCCUPIED" && input.status !== "OCCUPIED") throw new Error("End the active lease before changing an occupied unit.");
  const { data, error } = await supabase.from("units").update({ ...unitPayload(input), status_version: expectedVersion + 1 }).eq("id", unitId).eq("status_version", expectedVersion).select(`${SELECT}, status`).maybeSingle();
  if (error || !data) throw new Error(error?.message.includes("duplicate") ? "That unit number or public label already exists." : "Unit changed elsewhere. Refresh and try again.");
  return { ...mapRow(data as unknown as UnitRow), status: data.status };
}

/** Admin-only manual status transition with an append-only audit event. */
export async function updateAdminUnitStatus(
  unitId: string,
  nextStatus: ManualUnitStatus,
  reason: string,
): Promise<{ id: string; status: string }> {
  const actor = await authenticate();
  if (!actor?.roles.some((role) => role === "SUPER_ADMIN" || role === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  if (!MANUAL_UNIT_STATUSES.includes(nextStatus)) {
    throw new Error("That status cannot be assigned manually.");
  }

  const supabase = createServiceRoleClient();
  const { data: unit } = await supabase
    .from("units")
    .select("id, status")
    .eq("id", unitId)
    .maybeSingle();
  if (!unit) throw new Error("Unit not found.");
  if (unit.status === "OCCUPIED") {
    const { count } = await supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", unitId)
      .eq("status", "ACTIVE");
    if ((count ?? 0) > 0) {
      throw new Error("End the active lease before changing this occupied unit.");
    }
  }
  if (unit.status === nextStatus) return { id: unit.id, status: unit.status };

  const { data: updated, error } = await supabase
    .from("units")
    .update({ status: nextStatus })
    .eq("id", unitId)
    .eq("status", unit.status)
    .select("id, status")
    .maybeSingle();
  if (error || !updated) throw new Error("Unit status changed elsewhere. Refresh and try again.");

  const { error: eventError } = await supabase.from("unit_status_events").insert({
    unit_id: unitId,
    previous_status: unit.status,
    next_status: nextStatus,
    source_entity: "ADMIN_UI",
    actor_id: actor.userId,
    reason,
  });
  if (eventError) throw new Error("Unit changed, but its audit event could not be recorded.");
  return { id: updated.id, status: updated.status };
}

export interface UnitFeatureValue {
  code: string;
  label: string;
  dataType: string;
  valueBoolean: boolean | null;
  valueNumeric: number | null;
  valueText: string | null;
}

export interface UnitDetail extends UnitListItem {
  minLeaseMonths: number;
  orientation: string | null;
  buildingName: string;
  features: UnitFeatureValue[];
}

export async function getPublicUnitByLabel(publicLabel: string): Promise<UnitDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select(
      SELECT +
        ", min_lease_months, orientation, buildings!inner(name), " +
        "unit_feature_values(value_boolean, value_numeric, value_text, unit_features!inner(code, label, data_type, is_public))",
    )
    .eq("status", "AVAILABLE")
    .eq("public_label", publicLabel)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as UnitRow & {
    min_lease_months: number;
    orientation: string | null;
    buildings: { name: string } | null;
    unit_feature_values: {
      value_boolean: boolean | null;
      value_numeric: number | string | null;
      value_text: string | null;
      unit_features: { code: string; label: string; data_type: string; is_public: boolean } | null;
    }[];
  };

  const base = mapRow(row);
  const features: UnitFeatureValue[] = (row.unit_feature_values ?? [])
    .filter((fv) => fv.unit_features?.is_public)
    .map((fv) => ({
      code: fv.unit_features!.code,
      label: fv.unit_features!.label,
      dataType: fv.unit_features!.data_type,
      valueBoolean: fv.value_boolean,
      valueNumeric: fv.value_numeric !== null ? Number(fv.value_numeric) : null,
      valueText: fv.value_text,
    }));

  return {
    ...base,
    minLeaseMonths: row.min_lease_months,
    orientation: row.orientation,
    buildingName: row.buildings?.name ?? "Vertica Residences",
    features,
  };
}

/** Re-check that a unit is still AVAILABLE (used before reservation/inquiry). */
export async function isUnitAvailable(publicLabel: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id")
    .eq("status", "AVAILABLE")
    .eq("public_label", publicLabel)
    .maybeSingle();
  return !!data;
}

export async function getUnitsByLabels(labels: string[]): Promise<UnitDetail[]> {
  const results = await Promise.all(labels.map((l) => getPublicUnitByLabel(l)));
  return results.filter((u): u is UnitDetail => u !== null);
}
