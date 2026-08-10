"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/design-system/Modal";

type Client = { id: string; fullName: string; email: string | null; phone: string | null; source: string | null; createdAt: string; archivedAt: string | null; statusVersion: number };

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [active, setActive] = useState<Client | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/v1/clients", { cache: "no-store" });
      const json = await response.json();
      if (!json.ok) throw new Error();
      setClients(json.data.clients ?? []);
      setState("ready");
    } catch { setState("error"); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const visible = useMemo(() => clients.filter((client) => showArchived || !client.archivedAt), [clients, showArchived]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/clients/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: data.get("fullName"), email: data.get("email") || null, phone: data.get("phone") || null, archived: data.get("archived") === "true" }),
      });
      const json = await response.json();
      if (!json.ok) { setMessage(json.error?.message ?? "Client could not be saved."); return; }
      setClients((current) => current.map((client) => client.id === active.id ? json.data.client : client));
      setActive(null);
    } catch { setMessage("Network error. No changes were saved."); }
    finally { setSaving(false); }
  }

  return <div className="page-shell">
    <header className="page-header"><p className="eyebrow">CRM</p><h1>Clients</h1><p>Edit contact records or archive duplicates without deleting their inquiry history.</p></header>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-neutral-700"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived</label>
      <button type="button" className="action-button action-button--secondary" onClick={() => void load()}>Refresh</button>
    </div>
    {state === "loading" && <div className="surface-card p-5 text-sm text-neutral-600">Loading client records...</div>}
    {state === "error" && <div className="empty-state" role="alert">Client records could not be loaded. <button className="underline" onClick={() => void load()}>Try again</button></div>}
    {state === "ready" && visible.length === 0 && <div className="empty-state">No matching client records.</div>}
    {state === "ready" && visible.length > 0 && <div className="surface-card overflow-hidden"><table className="data-table data-table--responsive"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Source</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{visible.map((client) => <tr key={client.id}><td data-label="Name" className="font-semibold">{client.fullName}</td><td data-label="Email">{client.email ?? "Not provided"}</td><td data-label="Phone">{client.phone ?? "Not provided"}</td><td data-label="Source">{client.source ?? "Unknown"}</td><td data-label="Status"><span className={`status-chip status-chip--${client.archivedAt ? "neutral" : "success"}`}>{client.archivedAt ? "ARCHIVED" : "ACTIVE"}</span></td><td data-label="Action"><button className="text-sm font-bold text-emerald-800 underline" onClick={() => { setMessage(null); setActive(client); }}>Edit</button></td></tr>)}</tbody></table></div>}
    <Modal title="Edit client" description="Contact changes update the CRM record while preserving its history." open={Boolean(active)} onClose={() => setActive(null)}>
      {active && <form className="form-stack" onSubmit={save}>
        <label className="form-field">Full name<input name="fullName" defaultValue={active.fullName} required minLength={2} /></label>
        <label className="form-field">Email<input name="email" type="email" defaultValue={active.email ?? ""} /></label>
        <label className="form-field">Phone<input name="phone" defaultValue={active.phone ?? ""} /></label>
        <label className="form-field">Record status<select name="archived" defaultValue={active.archivedAt ? "true" : "false"}><option value="false">Active</option><option value="true">Archived</option></select></label>
        {message && <div className="inline-feedback" data-tone="error" role="alert">{message}</div>}
        <div className="form-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setActive(null)}>Cancel</button><button className="action-button" disabled={saving}>{saving ? "Saving..." : "Save client"}</button></div>
      </form>}
    </Modal>
  </div>;
}
