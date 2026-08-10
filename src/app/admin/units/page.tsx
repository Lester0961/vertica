"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building3D } from "@/components/units/Building3D";
import { Modal } from "@/components/design-system/Modal";
import { Input } from "@/components/design-system/Input";
import { formatPeso } from "@/lib/utils/format";
import { useRealtimeTables } from "@/components/realtime/RealtimeRefresh";

type Unit = { id: string; publicLabel: string; unitNumber?: string; unitTypeName: string; unitTypeId?: string; floorNumber: number; floorLabel: string; floorId?: string; buildingId?: string; status: string; statusVersion?: number; monthlyRent: number; monthlyDues: number; areaSqm: number; capacity: number | null; furnishing: string | null; availableFrom: string | null; minLeaseMonths?: number; orientation?: string | null; isPublic?: boolean };
type Options = { buildings: { id: string; name: string }[]; floors: { id: string; building_id: string; floor_number: number; public_label: string }[]; unitTypes: { id: string; code: string; name: string; base_area_sqm: number | null; capacity: number | null; default_dues: number }[] };
type Editor = { mode: "create" | "details" | "status"; unit?: Unit } | null;
const EDITABLE_STATUSES = ["DRAFT", "AVAILABLE", "RESERVED", "MAINTENANCE", "UNAVAILABLE"];
const tone = (status: string) => status === "AVAILABLE" ? "success" : status === "MAINTENANCE" ? "warning" : "neutral";

export default function AdminUnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [options, setOptions] = useState<Options>({ buildings: [], floors: [], unitTypes: [] });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState("ALL");
  const [editor, setEditor] = useState<Editor>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [unitResponse, optionResponse] = await Promise.all([fetch("/api/v1/admin/units", { cache: "no-store" }), fetch("/api/v1/admin/units/options", { cache: "no-store" })]);
      const [unitJson, optionJson] = await Promise.all([unitResponse.json(), optionResponse.json()]);
      if (!unitResponse.ok || !optionResponse.ok || !unitJson.ok || !optionJson.ok) throw new Error("Inventory could not be loaded.");
      setUnits(unitJson.data.units ?? []);
      setOptions(optionJson.data);
      setState("ready");
    } catch { setState("error"); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useRealtimeTables(["units"], load);
  const statuses = useMemo(() => ["ALL", ...Array.from(new Set(units.map((unit) => unit.status)))], [units]);
  const shown = filter === "ALL" ? units : units.filter((unit) => unit.status === filter);

  async function saveStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor?.unit) return;
    const form = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/v1/admin/units/${editor.unit.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: form.status, reason: form.reason }) });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message ?? "Status could not be changed.");
      setMessage(`${editor.unit.publicLabel} is now ${json.data.unit.status.replaceAll("_", " ")}.`);
      setEditor(null); await load();
    } catch (error) { setMessage((error as Error).message); } finally { setSaving(false); }
  }

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = { buildingId: values.buildingId, floorId: values.floorId, unitTypeId: values.unitTypeId, unitNumber: values.unitNumber, publicLabel: values.publicLabel, areaSqm: Number(values.areaSqm), monthlyRent: Number(values.monthlyRent), monthlyDues: Number(values.monthlyDues), availableFrom: values.availableFrom || null, minLeaseMonths: Number(values.minLeaseMonths), status: values.status, isPublic: values.isPublic === "on", furnishing: values.furnishing || null, capacity: values.capacity ? Number(values.capacity) : null, orientation: values.orientation || null, ...(editor.unit ? { expectedVersion: editor.unit.statusVersion ?? 1 } : {}) };
    setSaving(true); setMessage(null);
    try {
      const isCreate = editor.mode === "create";
      const response = await fetch(isCreate ? "/api/v1/admin/units" : `/api/v1/admin/units/${editor.unit!.id}/details`, { method: isCreate ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message ?? "Unit could not be saved.");
      setMessage(`${json.data.unit.publicLabel} ${isCreate ? "created" : "updated"}.`);
      setEditor(null); await load();
    } catch (error) { setMessage((error as Error).message); } finally { setSaving(false); }
  }

  const unit = editor?.unit;
  const buildingId = unit?.buildingId ?? options.buildings[0]?.id ?? "";
  return <div className="page-shell">
    <header className="page-header"><p className="eyebrow">Property inventory</p><div className="flex flex-wrap items-end justify-between gap-4"><div><h1>Units</h1><p>Manage the complete 24-unit inventory and its public availability.</p></div><button className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900" onClick={() => setEditor({ mode: "create" })}>Add unit</button></div></header>
    <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter unit status">{statuses.map((status) => <button key={status} onClick={() => setFilter(status)} className={filter === status ? "rounded-full bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"}>{status.replaceAll("_", " ")}</button>)}</div>
    {state === "loading" && <p className="text-sm text-neutral-500" role="status">Loading inventory...</p>}
    {state === "error" && <div className="empty-state" role="alert"><strong>Inventory could not be loaded.</strong><button className="underline" onClick={() => void load()}>Try again</button></div>}
    {message && <p className="mb-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm" role="status">{message}</p>}
    {state === "ready" && units.length > 0 && <section className="surface-card mb-6 p-4"><div className="mb-3"><h2 className="font-bold">Live 3D status map</h2><p className="text-sm text-neutral-600">Select a unit to open its details. Status colors update after every saved change.</p></div><Building3D units={shown.length ? shown : units} selectedId={unit?.id} onSelect={(selected) => { const match = units.find((item) => item.id === selected.id); if (match) setEditor({ mode: "details", unit: match }); }} /></section>}
    {state === "ready" && shown.length === 0 && <div className="empty-state">No units match this status filter.</div>}
    {state === "ready" && shown.length > 0 && <div className="surface-card overflow-hidden"><table className="data-table data-table--responsive"><thead><tr><th>Unit</th><th>Type</th><th>Floor</th><th>Area</th><th>Monthly rent</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{shown.map((item) => <tr key={item.id}><td data-label="Unit" className="font-semibold">{item.publicLabel}</td><td data-label="Type">{item.unitTypeName}</td><td data-label="Floor">{item.floorLabel}</td><td data-label="Area">{item.areaSqm} m²</td><td data-label="Monthly rent" className="tabular">{formatPeso(item.monthlyRent)}</td><td data-label="Status"><span className={`status-chip status-chip--${tone(item.status)}`}>{item.status.replaceAll("_", " ")}</span></td><td data-label="Actions"><div className="flex flex-wrap gap-3"><button className="text-sm font-semibold text-emerald-800 underline" onClick={() => setEditor({ mode: "details", unit: item })}>Edit</button><button className="text-sm font-semibold text-neutral-700 underline" onClick={() => setEditor({ mode: "status", unit: item })}>Status</button></div></td></tr>)}</tbody></table></div>}

    <Modal open={editor?.mode === "status"} onClose={() => setEditor(null)} title={`Change ${unit?.publicLabel ?? "unit"} status`}><form className="space-y-4" onSubmit={saveStatus}><label className="block text-sm font-semibold">Status<select name="status" defaultValue={EDITABLE_STATUSES.includes(unit?.status ?? "") ? unit?.status : "AVAILABLE"} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2">{EDITABLE_STATUSES.filter((status) => status !== "DRAFT").map((status) => <option key={status}>{status}</option>)}</select></label><label className="block text-sm font-semibold">Reason<textarea name="reason" required minLength={3} className="mt-1 block min-h-24 w-full rounded-md border border-neutral-300 px-3 py-2" /></label><div className="flex justify-end gap-3"><button type="button" className="rounded-md px-3 py-2 text-sm font-semibold" onClick={() => setEditor(null)}>Cancel</button><button disabled={saving} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save status"}</button></div></form></Modal>

    <Modal open={editor?.mode === "create" || editor?.mode === "details"} onClose={() => setEditor(null)} title={editor?.mode === "create" ? "Add unit" : `Edit ${unit?.publicLabel ?? "unit"}`} size="lg"><form className="space-y-4" onSubmit={saveDetails}><div className="grid gap-3 sm:grid-cols-2"><Input label="Unit number" name="unitNumber" defaultValue={unit?.unitNumber ?? ""} required /><Input label="Public label" name="publicLabel" defaultValue={unit?.publicLabel ?? ""} required /></div><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold">Building<select name="buildingId" defaultValue={buildingId} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2">{options.buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-semibold">Floor<select name="floorId" defaultValue={unit?.floorId ?? ""} required className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"><option value="">Select floor</option>{options.floors.filter((item) => item.building_id === buildingId).map((item) => <option key={item.id} value={item.id}>{item.public_label}</option>)}</select></label><label className="text-sm font-semibold">Unit type<select name="unitTypeId" defaultValue={unit?.unitTypeId ?? ""} required className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"><option value="">Select type</option>{options.unitTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="grid gap-3 sm:grid-cols-3"><Input label="Area (m²)" name="areaSqm" type="number" step="0.01" defaultValue={String(unit?.areaSqm ?? "")} required /><Input label="Monthly rent" name="monthlyRent" type="number" defaultValue={String(unit?.monthlyRent ?? "")} required /><Input label="Monthly dues" name="monthlyDues" type="number" defaultValue={String(unit?.monthlyDues ?? 0)} required /></div><div className="grid gap-3 sm:grid-cols-3"><Input label="Available from" name="availableFrom" type="date" defaultValue={unit?.availableFrom ?? ""} /><Input label="Minimum lease months" name="minLeaseMonths" type="number" defaultValue={String(unit?.minLeaseMonths ?? 12)} required /><Input label="Capacity" name="capacity" type="number" defaultValue={String(unit?.capacity ?? "")} /></div><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold">Status<select name="status" defaultValue={unit?.status ?? "DRAFT"} disabled={unit?.status === "OCCUPIED"} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-100">{[...EDITABLE_STATUSES, ...(unit?.status === "OCCUPIED" ? ["OCCUPIED"] : [])].map((status) => <option key={status}>{status}</option>)}</select>{unit?.status === "OCCUPIED" && <input type="hidden" name="status" value="OCCUPIED" />}</label><label className="text-sm font-semibold">Furnishing<select name="furnishing" defaultValue={unit?.furnishing ?? ""} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"><option value="">Not set</option><option>UNFURNISHED</option><option>SEMI_FURNISHED</option><option>FURNISHED</option></select></label><Input label="Orientation" name="orientation" defaultValue={unit?.orientation ?? ""} /></div><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isPublic" defaultChecked={unit?.isPublic ?? false} /> Show in public catalogue</label><div className="flex justify-end gap-3"><button type="button" className="rounded-md px-3 py-2 text-sm font-semibold" onClick={() => setEditor(null)}>Cancel</button><button disabled={saving} className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : editor?.mode === "create" ? "Create unit" : "Save details"}</button></div></form></Modal>
  </div>;
}
