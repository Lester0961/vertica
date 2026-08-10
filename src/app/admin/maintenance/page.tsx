"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeTables } from "@/components/realtime/RealtimeRefresh";

type Request = { id: string; unitLabel: string; tenantName: string | null; category: string; priority: string; description: string; status: string; isSafety: boolean; createdAt: string; resolution: string | null };
const NEXT_STATUSES = ["TRIAGED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CLOSED", "REJECTED", "CANCELLED"];

export default function AdminMaintenancePage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [state, setState] = useState("loading");
  const [active, setActive] = useState<Request | null>(null);
  const [nextStatus, setNextStatus] = useState("IN_PROGRESS");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => { try { const response = await fetch("/api/v1/maintenance/requests", { cache: "no-store" }); const json = await response.json(); if (!json.ok) throw new Error(); setRequests(json.data.requests ?? []); setState("ready"); } catch { setState("error"); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useRealtimeTables(["maintenance_requests"], load);
  useEffect(() => { if (!active) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setActive(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [active]);

  function begin(request: Request) { setActive(request); setNextStatus(request.status === "SUBMITTED" ? "TRIAGED" : "IN_PROGRESS"); setReason(""); setMessage(null); }
  async function save() {
    if (!active) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/maintenance/requests/${active.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus, reason }) });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message ?? "Status could not be changed.");
      setRequests((current) => current.map((request) => request.id === active.id ? { ...request, status: json.data.request.status, resolution: json.data.request.resolution } : request));
      setMessage(`${active.unitLabel} request moved to ${json.data.request.status.replaceAll("_", " ")}.`);
      setActive(null);
    } catch (error) { setMessage((error as Error).message); }
    finally { setSaving(false); }
  }

  return <div className="page-shell"><header className="page-header"><p className="eyebrow">Operations</p><h1>Maintenance requests</h1><p>Review requests and move them through the full service lifecycle.</p></header>
    {message && <p className="mb-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm" role="status">{message}</p>}
    {state === "loading" && <p className="text-sm text-neutral-500">Loading requests…</p>}{state === "error" && <div className="empty-state" role="alert">Maintenance requests could not be loaded.</div>}{state === "ready" && requests.length === 0 && <div className="empty-state">No maintenance requests have been submitted.</div>}
    <div className="grid gap-3">{requests.map((request) => <article key={request.id} className="surface-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{request.unitLabel} · {request.category}</p><h2 className="mt-1 text-base font-bold">{request.tenantName ?? "Resident"}</h2></div><span className={`status-chip status-chip--${request.isSafety ? "danger" : request.status === "COMPLETED" || request.status === "CLOSED" ? "success" : "warning"}`}>{request.isSafety ? "Safety issue" : request.status.replaceAll("_", " ")}</span></div><p className="mt-3 text-sm text-neutral-700">{request.description}</p><div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-500"><span>{request.priority} priority</span><span>Submitted {new Date(request.createdAt).toLocaleString()}</span>{request.resolution && <span>Resolution: {request.resolution}</span>}{!["CLOSED", "REJECTED", "CANCELLED"].includes(request.status) && <button className="ml-auto text-sm font-semibold text-emerald-800 underline" onClick={() => begin(request)}>Update status</button>}</div></article>)}</div>
    {active && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="maintenance-status-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setActive(null); }}><form className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onSubmit={(event) => { event.preventDefault(); void save(); }}><h2 id="maintenance-status-title" className="text-lg font-bold">Update {active.unitLabel} request</h2><label className="mt-5 block text-sm font-semibold">Status<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2">{NEXT_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label><label className="mt-4 block text-sm font-semibold">Reason or resolution<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} required className="mt-1 block min-h-24 w-full rounded-md border border-neutral-300 px-3 py-2" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setActive(null)} className="rounded-md px-3 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save status"}</button></div></form></div>}
  </div>;
}
