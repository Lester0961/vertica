"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/design-system/Modal";

type Reservation = { id: string; unitLabel: string; status: string; decisionReason: string | null; createdAt: string; prospectName: string | null; prospectEmail: string | null; statusVersion: number };

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [active, setActive] = useState<Reservation | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "CANCELLED">("APPROVED");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { setState("loading"); try { const response = await fetch("/api/v1/reservations", { cache: "no-store" }); const json = await response.json(); if (!json.ok) throw new Error(); setReservations(json.data.reservations ?? []); setState("ready"); } catch { setState("error"); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!active) return; const data = new FormData(event.currentTarget); setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/v1/reservations/${active.id}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, reason: data.get("reason") }) });
      const json = await response.json(); if (!json.ok) { setMessage(json.error?.message ?? "Decision could not be saved."); return; }
      setReservations((current) => current.map((item) => item.id === active.id ? { ...item, ...json.data.reservation } : item)); setActive(null);
    } catch { setMessage("Network error. The request was not changed."); } finally { setSaving(false); }
  }

  return <div className="page-shell">
    <header className="page-header"><p className="eyebrow">Leasing funnel</p><h1>Reservation requests</h1><p>Approve a 48-hour unit hold or close requests with a recorded reason.</p></header>
    {state === "loading" && <div className="surface-card p-5 text-sm text-neutral-600">Loading requests...</div>}
    {state === "error" && <div className="empty-state" role="alert">Reservation requests could not be loaded. <button className="underline" onClick={() => void load()}>Try again</button></div>}
    {state === "ready" && reservations.length === 0 && <div className="empty-state">No reservation requests have been submitted.</div>}
    {state === "ready" && reservations.length > 0 && <div className="surface-card overflow-hidden"><table className="data-table data-table--responsive"><thead><tr><th>Unit</th><th>Prospect</th><th>Status</th><th>Decision note</th><th>Submitted</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{reservations.map((item) => <tr key={item.id}><td data-label="Unit" className="font-semibold">{item.unitLabel}</td><td data-label="Prospect">{item.prospectName ?? "Unknown prospect"}<span className="block text-xs text-neutral-500">{item.prospectEmail ?? "No email"}</span></td><td data-label="Status"><span className={`status-chip status-chip--${item.status === "APPROVED" ? "success" : item.status === "REQUESTED" ? "warning" : "neutral"}`}>{item.status}</span></td><td data-label="Decision note">{item.decisionReason ?? "Awaiting decision"}</td><td data-label="Submitted">{new Date(item.createdAt).toLocaleString()}</td><td data-label="Action">{item.status === "REQUESTED" ? <button className="text-sm font-bold text-emerald-800 underline" onClick={() => { setActive(item); setDecision("APPROVED"); setMessage(null); }}>Review</button> : <span className="text-xs text-neutral-500">Completed</span>}</td></tr>)}</tbody></table></div>}
    <Modal title="Review reservation" description={active ? `${active.prospectName ?? "Prospect"} requested ${active.unitLabel}.` : undefined} open={Boolean(active)} onClose={() => setActive(null)}>
      {active && <form className="form-stack" onSubmit={submit}>
        <label className="form-field">Decision<select value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}><option value="APPROVED">Approve 48-hour hold</option><option value="REJECTED">Reject</option><option value="CANCELLED">Cancel request</option></select></label>
        <label className="form-field">Reason<textarea name="reason" required minLength={3} placeholder="Explain the decision for the audit trail" /></label>
        {decision === "APPROVED" && <div className="inline-feedback">Approving reserves the unit immediately for 48 hours.</div>}
        {message && <div className="inline-feedback" data-tone="error" role="alert">{message}</div>}
        <div className="form-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setActive(null)}>Cancel</button><button className={`action-button ${decision === "REJECTED" ? "action-button--danger" : ""}`} disabled={saving}>{saving ? "Saving..." : "Confirm decision"}</button></div>
      </form>}
    </Modal>
  </div>;
}
