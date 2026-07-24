import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UnitCard, type UnitCardData } from "@/components/units/UnitCard";

export const metadata: Metadata = { title: "Available units" };
export const dynamic = "force-dynamic";

export default async function AvailableUnitsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id, public_label, area_sqm, monthly_rent, monthly_dues, capacity, available_from, unit_types(name, bedrooms, bathrooms)")
    .eq("status", "AVAILABLE")
    .order("monthly_rent", { ascending: true });

  type Row = {
    id: string; public_label: string; area_sqm: number | string; monthly_rent: number | string;
    monthly_dues: number | string; capacity: number | null; available_from: string | null;
    unit_types: { name: string; bedrooms: number; bathrooms: number | string } | null;
  };
  const units: (UnitCardData & { id: string })[] = ((data ?? []) as unknown as Row[]).map((r) => ({
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
  }));

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-7) var(--space-5)" }}>
      <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12, color: "var(--muted)" }}>
        Residences
      </p>
      <h1 style={{ fontSize: 36, margin: "8px 0 4px" }}>Available units</h1>
      <p style={{ color: "var(--muted)", marginBottom: "var(--space-6)" }}>
        {units.length} unit{units.length === 1 ? "" : "s"} available now. Full
        filtering and comparison arrive in Phase 5.
      </p>
      {units.length === 0 ? (
        <p>
          No units available.{" "}
          <Link href="/inquiry" style={{ fontWeight: 600 }}>Join the availability list →</Link>
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-5)" }}>
          {units.map((u) => (
            <UnitCard key={u.id} unit={u} />
          ))}
        </div>
      )}
    </main>
  );
}
