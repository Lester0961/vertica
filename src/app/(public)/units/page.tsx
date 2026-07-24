import type { Metadata } from "next";
import { UnitCatalogue } from "@/components/units/UnitCatalogue";
import { getUnitTypes } from "@/features/property/queries";
import { listPublicUnits, type UnitFilters } from "@/features/units/queries";

export const metadata: Metadata = { title: "Available units" };

function num(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const val = (k: string): string | undefined => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const filters: UnitFilters = {
    type: val("type") || undefined,
    minRent: num(val("minRent")),
    maxRent: num(val("maxRent")),
    minArea: num(val("minArea")),
    maxArea: num(val("maxArea")),
    floor: num(val("floor")),
    furnishing: val("furnishing") || undefined,
    moveInBy: val("moveInBy") || undefined,
    sort: (val("sort") as UnitFilters["sort"]) || undefined,
  };

  const [units, unitTypes] = await Promise.all([listPublicUnits(filters), getUnitTypes()]);

  return (
    <main>
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Residences</p>
          <h1 className="mt-1 text-3xl font-semibold text-neutral-900">Browse available units</h1>
          <p className="mt-2 max-w-2xl text-neutral-600">
            Filter by type, rent, size, floor, and move-in date. Every listing is a real, currently available home.
          </p>
        </div>
      </header>
      <UnitCatalogue
        initialUnits={units}
        unitTypes={unitTypes.map((t) => ({ code: t.code, name: t.name }))}
      />
    </main>
  );
}
