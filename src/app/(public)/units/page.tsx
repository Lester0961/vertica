import type { Metadata } from "next";
import { Suspense } from "react";
import { UnitCatalogue } from "@/components/units/UnitCatalogue";
import { getUnitTypes } from "@/features/property/queries";
import { listPublicUnits, type UnitFilters } from "@/features/units/queries";

export const metadata: Metadata = { title: "Available units" };

function num(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

type UnitsSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function UnitsPage({
  searchParams,
}: {
  searchParams: UnitsSearchParams;
}) {
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
      <Suspense fallback={<UnitsCatalogueSkeleton />}>
        <UnitsCatalogueResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function UnitsCatalogueResults({ searchParams }: { searchParams: UnitsSearchParams }) {
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
    <>
      <UnitCatalogue
        initialUnits={units}
        unitTypes={unitTypes.map((t) => ({ code: t.code, name: t.name }))}
      />
    </>
  );
}

function UnitsCatalogueSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[280px_1fr]" aria-busy="true">
      <aside className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
        <div className="mt-6 space-y-5">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
              <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
            </div>
          ))}
        </div>
      </aside>
      <section role="status" aria-live="polite">
        <p className="mb-4 text-sm text-neutral-500">Loading available units…</p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
          ))}
        </div>
      </section>
    </div>
  );
}
