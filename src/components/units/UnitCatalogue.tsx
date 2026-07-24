"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/design-system/Input";
import { UnitCard } from "@/components/units/UnitCard";
import type { UnitListItem } from "@/features/units/queries";

interface UnitTypeOption {
  code: string;
  name: string;
}

export function UnitCatalogue({
  initialUnits,
  unitTypes,
}: {
  initialUnits: UnitListItem[];
  unitTypes: UnitTypeOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value) next.delete(key);
      else next.set(key, value);
      startTransition(() => {
        router.replace(`/units?${next.toString()}`, { scroll: false });
      });
    },
    [params, router],
  );

  const get = (key: string) => params.get(key) ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Filters</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Unit type</span>
              <select
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                value={get("type")}
                onChange={(e) => update("type", e.target.value)}
              >
                <option value="">Any</option>
                {unitTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Min rent"
                type="number"
                inputMode="numeric"
                value={get("minRent")}
                onChange={(e) => update("minRent", e.target.value)}
              />
              <Input
                label="Max rent"
                type="number"
                inputMode="numeric"
                value={get("maxRent")}
                onChange={(e) => update("maxRent", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Min area (m²)"
                type="number"
                inputMode="numeric"
                value={get("minArea")}
                onChange={(e) => update("minArea", e.target.value)}
              />
              <Input
                label="Max area (m²)"
                type="number"
                inputMode="numeric"
                value={get("maxArea")}
                onChange={(e) => update("maxArea", e.target.value)}
              />
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Floor</span>
              <Input
                type="number"
                inputMode="numeric"
                value={get("floor")}
                onChange={(e) => update("floor", e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Furnishing</span>
              <select
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                value={get("furnishing")}
                onChange={(e) => update("furnishing", e.target.value)}
              >
                <option value="">Any</option>
                <option value="UNFURNISHED">Unfurnished</option>
                <option value="SEMI_FURNISHED">Semi-furnished</option>
                <option value="FULLY_FURNISHED">Fully furnished</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Available by</span>
              <Input type="date" value={get("moveInBy")} onChange={(e) => update("moveInBy", e.target.value)} />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Sort</span>
              <select
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                value={get("sort")}
                onChange={(e) => update("sort", e.target.value)}
              >
                <option value="">Default</option>
                <option value="rent_asc">Rent: low to high</option>
                <option value="rent_desc">Rent: high to low</option>
                <option value="area_asc">Area: small to large</option>
                <option value="area_desc">Area: large to small</option>
                <option value="available_asc">Earliest available</option>
              </select>
            </label>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-neutral-600">
              {pending ? "Updating…" : `${initialUnits.length} unit${initialUnits.length === 1 ? "" : "s"} available`}
            </p>
          </div>
          {initialUnits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
              No units match these filters yet.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {initialUnits.map((u) => (
                <UnitCard key={u.id} unit={u} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
