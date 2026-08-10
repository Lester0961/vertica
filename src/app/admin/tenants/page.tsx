"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/design-system/Modal";

type Tenant = { id: string; tenantNumber: string; status: string; fullName: string | null; email: string | null; createdAt: string; statusVersion: number };

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [active, setActive] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { setState("loading"); try { const response = await fetch("/api/v1/tenants", { cache: "no-store" }); const json = await response.json(); if (!json.ok) throw new Error(); setTenants(json.data.tenants ?? []); setState("ready"); } catch { setState("error"); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!active) return; const data = new FormData(event.currentTarget); setSaving(true); setMessage(null); try { const response = await fetch(`/api/v1/tenants/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: data.get("status") }) }); const json = await response.json(); if (!json.ok) { setMessage(json.error?.message ?? "Tenant could not be updated."); return; } setTenants((current) => current.map((item) => item.id === active.id ? { ...item, status: json.data.tenant.status } : item)); setActive(null); } catch { setMessage("Network error. No changes were saved."); } finally { setSaving(false); } }

  return <div className="page-shell">
    <header className="page-header"><p className="eyebrow">Residency</p><h1>Tenants</h1><p>Manage residency status without deleting lease, billing, or maintenance history.</p></header>
    {state === "loading" && <div className="surface-card p-5 text-sm text-neutral-600">Loading tenant records...</div>}
    {state === "error" && <div className="empty-state" role="alert">Tenant records could not be loaded. <button className="underline" onClick={() => void load()}>Try again</button></div>}
    {state === "ready" && tenants.length === 0 && <div className="empty-state">No tenant records have been created.</div>}
    {state === "ready" && tenants.length > 0 && <div className="surface-card overflow-hidden"><table className="data-table data-table--responsive"><thead><tr><th>Tenant no.</th><th>Name</th><th>Email</th><th>Status</th><th>Created</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{tenants.map((tenant) => <tr key={tenant.id}><td data-label="Tenant no." className="font-semibold">{tenant.tenantNumber}</td><td data-label="Name">{tenant.fullName ?? "Unlinked tenant"}</td><td data-label="Email">{tenant.email ?? "No email"}</td><td data-label="Status"><span className={`status-chip status-chip--${tenant.status === "ACTIVE" ? "success" : tenant.status === "PENDING" ? "warning" : "neutral"}`}>{tenant.status}</span></td><td data-label="Created">{new Date(tenant.createdAt).toLocaleDateString()}</td><td data-label="Action"><button className="text-sm font-bold text-emerald-800 underline" onClick={() => { setMessage(null); setActive(tenant); }}>Change status</button></td></tr>)}</tbody></table></div>}
    <Modal title="Change tenant status" description={active ? `${active.tenantNumber}: ${active.fullName ?? "Unlinked tenant"}` : undefined} open={Boolean(active)} onClose={() => setActive(null)}>
      {active && <form className="form-stack" onSubmit={save}><label className="form-field">Status<select name="status" defaultValue={active.status}><option value="PENDING">Pending</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><div className="inline-feedback">Historical leases and records remain available after status changes.</div>{message && <div className="inline-feedback" data-tone="error" role="alert">{message}</div>}<div className="form-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setActive(null)}>Cancel</button><button className="action-button" disabled={saving}>{saving ? "Saving..." : "Save status"}</button></div></form>}
    </Modal>
  </div>;
}
