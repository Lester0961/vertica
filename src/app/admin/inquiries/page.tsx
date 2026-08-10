"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/design-system/Modal";

interface Inquiry { id: string; fullName: string | null; email: string | null; phone: string | null; status: string; summary: string | null; createdAt: string; unitLabels: string[]; statusVersion: number; nextAction: string | null; nextActionAt: string | null }
const STATUSES = ["NEW", "CONTACTED", "FOLLOW_UP", "QUALIFIED", "CONVERTED", "CLOSED_LOST"];

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState("OPEN");
  const [active, setActive] = useState<Inquiry | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { setState("loading"); try { const response = await fetch("/api/v1/inquiries", { cache: "no-store" }); const json = await response.json(); if (!json.ok) throw new Error(); setInquiries(json.data.inquiries ?? []); setState("ready"); } catch { setState("error"); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const visible = useMemo(() => filter === "ALL" ? inquiries : filter === "OPEN" ? inquiries.filter((item) => !["CONVERTED", "CLOSED_LOST"].includes(item.status)) : inquiries.filter((item) => item.status === filter), [filter, inquiries]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!active) return;
    const data = new FormData(event.currentTarget); setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/v1/inquiries/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: data.get("status"), reason: data.get("reason"), nextAction: data.get("nextAction") || null, nextActionAt: data.get("nextActionAt") || null }) });
      const json = await response.json();
      if (!json.ok) { setMessage(json.error?.message ?? "Inquiry could not be updated."); return; }
      setInquiries((current) => current.map((item) => item.id === active.id ? { ...item, status: json.data.inquiry.status, nextAction: String(data.get("nextAction") || "") || null, nextActionAt: String(data.get("nextActionAt") || "") || null } : item));
      setActive(null);
    } catch { setMessage("Network error. No changes were saved."); }
    finally { setSaving(false); }
  }

  return <div className="page-shell">
    <header className="page-header"><p className="eyebrow">Leasing funnel</p><h1>Inquiries</h1><p>Move prospects from first contact to qualification, conversion, or closure.</p></header>
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Inquiry status filter">{["OPEN", "ALL", ...STATUSES].map((status) => <button key={status} className={`action-button ${filter === status ? "" : "action-button--secondary"}`} onClick={() => setFilter(status)}>{status.replaceAll("_", " ")}</button>)}</div>
    {state === "loading" && <div className="surface-card p-5 text-sm text-neutral-600">Loading inquiries...</div>}
    {state === "error" && <div className="empty-state" role="alert">Inquiries could not be loaded. <button className="underline" onClick={() => void load()}>Try again</button></div>}
    {state === "ready" && visible.length === 0 && <div className="empty-state">No inquiries match this filter.</div>}
    {state === "ready" && visible.length > 0 && <div className="surface-card overflow-hidden"><table className="data-table data-table--responsive"><thead><tr><th>Prospect</th><th>Interested units</th><th>Status</th><th>Next action</th><th>Created</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td data-label="Prospect"><strong>{item.fullName ?? "Unknown prospect"}</strong><span className="mt-1 block text-xs text-neutral-500">{item.email ?? item.phone ?? "No contact supplied"}</span></td><td data-label="Interested units">{item.unitLabels.length ? item.unitLabels.join(", ") : "General inquiry"}</td><td data-label="Status"><span className={`status-chip status-chip--${item.status === "CONVERTED" ? "success" : item.status === "CLOSED_LOST" ? "neutral" : "warning"}`}>{item.status.replaceAll("_", " ")}</span></td><td data-label="Next action">{item.nextAction ?? "Not scheduled"}{item.nextActionAt && <span className="block text-xs text-neutral-500">{new Date(item.nextActionAt).toLocaleDateString()}</span>}</td><td data-label="Created">{new Date(item.createdAt).toLocaleDateString()}</td><td data-label="Action"><button className="text-sm font-bold text-emerald-800 underline" onClick={() => { setMessage(null); setActive(item); }}>Update</button></td></tr>)}</tbody></table></div>}
    <Modal title="Update inquiry" description={active ? `${active.fullName ?? "Prospect"}: ${active.summary ?? "No message supplied"}` : undefined} open={Boolean(active)} onClose={() => setActive(null)}>
      {active && <form className="form-stack" onSubmit={save}>
        <label className="form-field">Status<select name="status" defaultValue={active.status}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="form-field">Next action<input name="nextAction" defaultValue={active.nextAction ?? ""} placeholder="Call, email, or schedule viewing" /></label>
        <label className="form-field">Next action date<input name="nextActionAt" type="date" defaultValue={active.nextActionAt ?? ""} /></label>
        <label className="form-field">Reason or note<textarea name="reason" required minLength={3} placeholder="Record what changed and why" /></label>
        {message && <div className="inline-feedback" data-tone="error" role="alert">{message}</div>}
        <div className="form-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setActive(null)}>Cancel</button><button className="action-button" disabled={saving}>{saving ? "Saving..." : "Save update"}</button></div>
      </form>}
    </Modal>
  </div>;
}
