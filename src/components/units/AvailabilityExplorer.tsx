"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building3D } from "@/components/units/Building3D";
import { formatPeso } from "@/lib/utils/format";

type Unit = { id: string; publicLabel: string; unitTypeName: string; floorNumber: number; floorLabel: string; monthlyRent: number; areaSqm: number; availableFrom: string | null };

export function AvailabilityExplorer() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [floor, setFloor] = useState<number | "all">("all");

  useEffect(() => {
    let active = true;
    fetch("/api/v1/public/units?limit=200").then((response) => response.json()).then((json) => {
      if (active && json.ok) {
        const next = json.data.units ?? [];
        setUnits(next);
        setSelected(next[0] ?? null);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const floors = useMemo(() => Array.from(new Set(units.map((unit) => unit.floorNumber))).sort((a, b) => b - a), [units]);
  const displayedUnits = floor === "all" ? units : units.filter((unit) => unit.floorNumber === floor);
  if (loading) return <p className="text-sm text-neutral-500" role="status">Loading available units…</p>;

  return <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
    <section className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-5">
        <div><p className="eyebrow">Interactive 3D availability</p><h2 className="mt-1 text-lg font-bold">Select an available residence</h2></div>
        <label className="text-sm font-semibold">Floor <select value={floor} onChange={(event) => setFloor(event.target.value === "all" ? "all" : Number(event.target.value))} className="ml-2 rounded-md border border-neutral-300 bg-white px-2 py-1.5"><option value="all">All floors</option>{floors.map((number) => <option key={number} value={number}>Floor {number}</option>)}</select></label>
      </div>
      <div className="p-5">
        {displayedUnits.length > 0 ? <Building3D units={displayedUnits} selectedId={selected?.id} onSelect={(unit) => setSelected(units.find((item) => item.id === unit.id) ?? null)} /> : <div className="empty-state">No available residences are listed for this floor.</div>}
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Available unit selection">{displayedUnits.map((unit) => <button key={unit.id} onClick={() => setSelected(unit)} aria-pressed={selected?.id === unit.id} className={selected?.id === unit.id ? "rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white" : "rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"}>{unit.publicLabel}</button>)}</div>
      </div>
    </section>
    <aside className="surface-card p-6">{selected ? <>
      <p className="eyebrow">Selected residence</p><h2 className="mt-2 text-2xl font-bold">{selected.publicLabel}</h2>
      <dl className="mt-5 grid gap-4 text-sm"><div><dt className="text-xs font-bold uppercase tracking-wider text-neutral-500">Layout</dt><dd className="mt-1 font-semibold">{selected.unitTypeName}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-neutral-500">Floor / area</dt><dd className="mt-1 font-semibold">{selected.floorLabel} · {selected.areaSqm} m²</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-neutral-500">Monthly rent</dt><dd className="mt-1 font-semibold tabular">{formatPeso(selected.monthlyRent)}</dd></div></dl>
      <Link href={`/units/${encodeURIComponent(selected.publicLabel)}`} className="mt-6 inline-flex rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white no-underline">Open detailed unit view</Link>
    </> : <div className="empty-state">No residences are currently available.</div>}</aside>
  </div>;
}
