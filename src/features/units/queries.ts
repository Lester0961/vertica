import { createClient } from "@/lib/supabase/server";

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
  unit_types: { code: string; name: string; bedrooms: number; bathrooms: number | string } | null;
  floors: { floor_number: number; public_label: string } | null;
}

const SELECT =
  "id, public_label, area_sqm, monthly_rent, monthly_dues, capacity, furnishing, available_from, " +
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
