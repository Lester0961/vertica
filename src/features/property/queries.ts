import { createClient } from "@/lib/supabase/server";

export interface PropertySummary {
  buildingName: string;
  tagline: string | null;
  description: string | null;
  availableCount: number;
  lowestAvailableRent: number | null;
  unitTypeCount: number;
}

export interface UnitTypeSummary {
  id: string;
  code: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  description: string | null;
  minRent: number | null;
  maxRent: number | null;
  minArea: number | null;
  maxArea: number | null;
}

export interface FeaturedUnit {
  id: string;
  publicLabel: string;
  unitTypeName: string;
  areaSqm: number;
  monthlyRent: number;
  monthlyDues: number;
  capacity: number | null;
  bedrooms: number;
  bathrooms: number;
  availableFrom: string | null;
}

/**
 * Public property + live availability summary. Uses the RLS-scoped anon/server
 * client, so only public data is ever returned.
 */
export async function getPropertySummary(): Promise<PropertySummary> {
  const supabase = await createClient();

  const [{ data: building }, { data: availableUnits }, { count: typeCount }] =
    await Promise.all([
      supabase
        .from("buildings")
        .select("name, brand_tagline, public_description")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("units")
        .select("monthly_rent")
        .eq("status", "AVAILABLE")
        .order("monthly_rent", { ascending: true }),
      supabase.from("unit_types").select("id", { count: "exact", head: true }),
    ]);

  const rents = (availableUnits ?? []).map((u) => Number(u.monthly_rent));

  return {
    buildingName: building?.name ?? "Vertica Residences",
    tagline: building?.brand_tagline ?? null,
    description: building?.public_description ?? null,
    availableCount: rents.length,
    lowestAvailableRent: rents.length ? Math.min(...rents) : null,
    unitTypeCount: typeCount ?? 0,
  };
}

export async function getUnitTypes(): Promise<UnitTypeSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("unit_types")
    .select("id, code, name, bedrooms, bathrooms, public_description, min_rent, max_rent, min_area_sqm, max_area_sqm")
    .order("bedrooms", { ascending: true });

  return (data ?? []).map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    bedrooms: t.bedrooms,
    bathrooms: Number(t.bathrooms),
    description: t.public_description,
    minRent: t.min_rent ? Number(t.min_rent) : null,
    maxRent: t.max_rent ? Number(t.max_rent) : null,
    minArea: t.min_area_sqm ? Number(t.min_area_sqm) : null,
    maxArea: t.max_area_sqm ? Number(t.max_area_sqm) : null,
  }));
}

/**
 * Three featured available units: best-priced, best space/value, earliest
 * move-in. Guaranteed to describe only AVAILABLE units.
 */
export async function getFeaturedUnits(): Promise<FeaturedUnit[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select(
      "id, public_label, area_sqm, monthly_rent, monthly_dues, capacity, available_from, unit_types(name, bedrooms, bathrooms)",
    )
    .eq("status", "AVAILABLE")
    .order("monthly_rent", { ascending: true });

  type Row = {
    id: string;
    public_label: string;
    area_sqm: string | number;
    monthly_rent: string | number;
    monthly_dues: string | number;
    capacity: number | null;
    available_from: string | null;
    unit_types: { name: string; bedrooms: number; bathrooms: number | string } | null;
  };

  const rows = (data ?? []) as unknown as Row[];
  const map = (r: Row): FeaturedUnit => ({
    id: r.id,
    publicLabel: r.public_label,
    unitTypeName: r.unit_types?.name ?? "Unit",
    areaSqm: Number(r.area_sqm),
    monthlyRent: Number(r.monthly_rent),
    monthlyDues: Number(r.monthly_dues),
    capacity: r.capacity,
    bedrooms: r.unit_types?.bedrooms ?? 0,
    bathrooms: Number(r.unit_types?.bathrooms ?? 0),
    availableFrom: r.available_from,
  });

  if (rows.length === 0) return [];

  const byPrice = [...rows].sort((a, b) => Number(a.monthly_rent) - Number(b.monthly_rent));
  const byValue = [...rows].sort(
    (a, b) => Number(a.monthly_rent) / Number(a.area_sqm) - Number(b.monthly_rent) / Number(b.area_sqm),
  );
  const byDate = [...rows].sort((a, b) => {
    const da = a.available_from ? new Date(a.available_from).getTime() : Infinity;
    const db = b.available_from ? new Date(b.available_from).getTime() : Infinity;
    return da - db;
  });

  const picks: Row[] = [];
  const seen = new Set<string>();
  for (const candidate of [byPrice[0], byValue[0], byDate[0]]) {
    if (candidate && !seen.has(candidate.id)) {
      seen.add(candidate.id);
      picks.push(candidate);
    }
  }
  // Backfill if duplicates collapsed the list.
  for (const r of byPrice) {
    if (picks.length >= 3) break;
    if (!seen.has(r.id)) {
      seen.add(r.id);
      picks.push(r);
    }
  }

  return picks.map(map);
}
