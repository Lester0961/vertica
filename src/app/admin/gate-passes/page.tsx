"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/design-system/Modal";

interface GatePass { id: string; unitLabel: string; validFrom: string; validTo: string; status: string; maxUses: number; useCount: number; visitors: { visitorName: string; vehiclePlate: string | null }[]; }

export default function AdminGatePassesPage() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState("ALL");
  const [active, setActive] = useState<GatePass | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { try { const response = await fetch("/api/v1/gate-passes", { cache: "no-store" }); const json = await response.json(); if (!response.ok || !json.ok) throw new Error(); setPasses(json.data.passes ?? []); setState("ready"); } catch { setState("error"); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const filtered = filter === "ALL" ? passes : passes.filter((pass) => pass.status === filter);

  async function revoke(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!active) return; setSaving(true); setMessage(null);
    const reason = new FormData(event.currentTarget).get("reason");
    try { const response = await fetch(`/api/v1/gate-passes/${active.id}/revoke`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) }); const json = await response.json(); if (!response.ok || !json.ok) throw new Error(json.error?.message ?? "Pass could not be revoked."); setMessage(`${active.unitLabel} gate pass revoked.`); setActive(null); await load(); } catch (error) { setMessage((error as Error).message); } finally { setSaving(false); }
  }

  return <div className="page-shell">
    <header className="page-header"><p className="eyebrow">Access control</p><h1>Gate passes</h1><p>Review visitor passes and revoke active access when needed.</p></header>
    <div className="mb-5 flex flex-wrap gap-2">{["ALL", "ACTIVE", "USED", "EXPIRED", "REVOKED"].map((status) => <button key={status} onClick={() => setFilter(status)} className={filter === status ? "rounded-full bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700"}>{status} {status !== "ALL" && `(${passes.filter((pass) => pass.status === status).length})`}</button>)}</div>
    {message && <p className="mb-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm" role="status">{message}</p>}
    {state === "loading" && <p role="status" className="text-sm text-neutral-500">Loading gate passes...</p>}
    {state === "error" && <div className="empty-state" role="alert"><strong>Gate passes could not be loaded.</strong><button onClick={() => void load()} className="underline">Try again</button></div>}
    {state === "ready" && !filtered.length && <div className="empty-state">No gate passes match this filter.</div>}
    {state === "ready" && filtered.length > 0 && <div className="surface-card overflow-hidden"><table className="data-table data-table--responsive"><thead><tr><th>Unit</th><th>Status</th><th>Valid</th><th>Uses</th><th>Visitors</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{filtered.map((pass) => <tr key={pass.id}><td data-label="Unit" className="font-semibold">{pass.unitLabel}</td><td data-label="Status"><span className={`status-chip status-chip--${pass.status === "ACTIVE" ? "success" : pass.status === "REVOKED" ? "danger" : "neutral"}`}>{pass.status}</span></td><td data-label="Valid">{new Date(pass.validFrom).toLocaleDateString()} - {new Date(pass.validTo).toLocaleDateString()}</td><td data-label="Uses">{pass.useCount}/{pass.maxUses}</td><td data-label="Visitors">{pass.visitors.map((visitor) => visitor.visitorName).join(", ") || "None"}</td><td data-label="Action">{pass.status === "ACTIVE" && <button className="text-sm font-semibold text-red-700 underline" onClick={() => setActive(pass)}>Revoke</button>}</td></tr>)}</tbody></table></div>}
    <Modal open={!!active} onClose={() => setActive(null)} title={`Revoke ${active?.unitLabel ?? "gate pass"}`}><form onSubmit={revoke} className="space-y-4"><p className="text-sm text-neutral-600">The code will stop working immediately. Existing entry and exit logs are retained.</p><label className="block text-sm font-semibold">Reason<textarea name="reason" required minLength={3} className="mt-1 block min-h-24 w-full rounded-md border border-neutral-300 px-3 py-2" /></label><div className="flex justify-end gap-3"><button type="button" className="rounded-md px-3 py-2 text-sm font-semibold" onClick={() => setActive(null)}>Cancel</button><button disabled={saving} className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Revoking..." : "Revoke pass"}</button></div></form></Modal>
  </div>;
}
