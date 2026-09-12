"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BuildingExperience3DLazy } from "@/components/units/three/lazy";
import { formatPeso } from "@/lib/utils/format";

type Unit = {
  id: string;
  publicLabel: string;
  unitNumber?: string;
  unitTypeCode: string;
  unitTypeName: string;
  bedrooms: number;
  floorNumber: number;
  floorLabel: string;
  monthlyRent: number;
  areaSqm: number;
  availableFrom: string | null;
};

type BuildingLayout = {
  building: { name: string };
  floors: { floorNumber: number; floorLabel: string; slotCount: number }[];
};

export function AvailabilityExplorer() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [layout, setLayout] = useState<BuildingLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [floor, setFloor] = useState<number | "all">("all");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/v1/public/units?limit=200", { cache: "no-store" }),
      fetch("/api/v1/public/building-layout", { cache: "no-store" }),
    ])
      .then(async ([unitResponse, layoutResponse]) => {
        const [unitJson, layoutJson] = await Promise.all([unitResponse.json(), layoutResponse.json()]);
        if (!unitResponse.ok || !unitJson.ok) throw new Error("Available residences could not be loaded.");
        if (!layoutResponse.ok || !layoutJson.ok) throw new Error("The building layout could not be loaded.");
        if (!active) return;
        const next: Unit[] = unitJson.data.units ?? [];
        setUnits(next);
        setLayout(layoutJson.data.layout ?? null);
        setSelected(next.find((unit) => unit.publicLabel === "Unit 204") ?? next[0] ?? null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "The building explorer could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const floors = useMemo(() => Array.from(new Set(units.map((unit) => unit.floorNumber))).sort((a, b) => b - a), [units]);
  const displayedUnits = useMemo(() => floor === "all" ? units : units.filter((unit) => unit.floorNumber === floor), [floor, units]);
  if (loading) return <p className="text-sm text-neutral-500" role="status">Loading available units…</p>;
  if (error) return <div className="empty-state" role="alert"><strong>Building explorer unavailable.</strong><p>{error}</p></div>;

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
    <section className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-5">
        <div>
          <p className="eyebrow">Interactive 3D availability</p>
          <h2 className="mt-1 text-lg font-bold">Select an available residence</h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">Unit 204 is selected to start. Use the highlighted homes or the unit buttons below to compare the building.</p>
        </div>
        <label className="text-sm font-semibold">Floor <select value={floor} onChange={(event) => { const nextFloor = event.target.value === "all" ? "all" : Number(event.target.value); setFloor(nextFloor); if (nextFloor !== "all") setSelected((current) => { const nextUnits = units.filter((unit) => unit.floorNumber === nextFloor); return nextUnits.some((unit) => unit.id === current?.id) ? current : nextUnits[0] ?? null; }); }} className="ml-2 rounded-md border border-neutral-300 bg-white px-2 py-1.5"><option value="all">All floors</option>{floors.map((number) => <option key={number} value={number}>Floor {number}</option>)}</select></label>
      </div>
      <div className="p-5">
        {units.length > 0 ? (
          <BuildingExperience3DLazy
            units={units}
            layout={layout ? { floors: layout.floors.map((item) => ({ floorNumber: item.floorNumber, label: item.floorLabel, slotCount: item.slotCount })) } : undefined}
            filters={floor === "all" ? undefined : { floor }}
            selectedId={selected?.id}
            onSelect={(unit) => setSelected(units.find((item) => item.id === unit.id) ?? null)}
          />
        ) : <div className="empty-state">No residences are currently available.</div>}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500" aria-live="polite">{displayedUnits.length} of {units.length} available homes shown</p>
          <p className="text-xs text-neutral-500">Green areas are available</p>
        </div>
        {displayedUnits.length === 0 && <p className="mt-4 text-sm text-neutral-500">No available residences are listed for this floor.</p>}
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Available unit selection">{displayedUnits.map((unit) => <button type="button" key={unit.id} onClick={() => setSelected(unit)} aria-pressed={selected?.id === unit.id} className={selected?.id === unit.id ? "rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white" : "rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"}>{unit.publicLabel}</button>)}</div>
      </div>
    </section>
    <aside className="surface-card p-6 lg:sticky lg:top-6 lg:self-start">{selected ? <>
      <p className="eyebrow">Selected residence</p><h2 className="mt-2 text-2xl font-bold">{selected.publicLabel}</h2>
      <p className="mt-1 text-sm text-neutral-500">{selected.bedrooms === 0 ? "Studio" : `${selected.bedrooms}-bedroom`} home ready for a closer look.</p>
      <dl className="mt-5 grid gap-4 text-sm"><div><dt className="text-xs font-bold uppercase tracking-wider text-neutral-500">Layout</dt><dd className="mt-1 font-semibold">{selected.unitTypeName}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-neutral-500">Floor / area</dt><dd className="mt-1 font-semibold">{selected.floorLabel} · {selected.areaSqm} m²</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-neutral-500">Monthly rent</dt><dd className="mt-1 font-semibold tabular">{formatPeso(selected.monthlyRent)}</dd></div></dl>
      <Link href={`/units/${encodeURIComponent(selected.publicLabel)}`} className="mt-6 inline-flex w-full justify-center rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white no-underline">Open {selected.publicLabel} tour</Link>
    </> : <div className="empty-state">No residences are currently available.</div>}</aside>
  </div>;
}
