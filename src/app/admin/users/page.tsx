"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/design-system/Modal";

interface UserProfile { id: string; email: string; displayName: string | null; phone: string | null; status: string; roles: string[]; createdAt: string }
const ROLES = ["SUPER_ADMIN", "PROPERTY_ADMIN", "TENANT", "GUARD", "MAINTENANCE"] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [active, setActive] = useState<UserProfile | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { setState("loading"); try { const response = await fetch("/api/v1/users", { cache: "no-store" }); const json = await response.json(); if (!json.ok) throw new Error(); setUsers(json.data.users ?? []); setState("ready"); } catch { setState("error"); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  function toggleRole(role: string) { setSelectedRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]); }

  async function invite(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); setMessage(null); try { const response = await fetch("/api/v1/users/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: data.get("displayName"), email: data.get("email"), role: data.get("role") }) }); const json = await response.json(); if (!json.ok) { setMessage(json.error?.message ?? "Invitation could not be sent."); return; } setUsers((current) => [json.data.user, ...current]); setShowInvite(false); } catch { setMessage("Network error. Invitation was not sent."); } finally { setSaving(false); } }
  async function saveAccess(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!active) return; const data = new FormData(event.currentTarget); setSaving(true); setMessage(null); try { const response = await fetch(`/api/v1/users/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: data.get("status"), roles: selectedRoles }) }); const json = await response.json(); if (!json.ok) { setMessage(json.error?.message ?? "Access could not be updated."); return; } setUsers((current) => current.map((item) => item.id === active.id ? { ...item, status: json.data.user.status, roles: json.data.user.roles } : item)); setActive(null); } catch { setMessage("Network error. Access was not changed."); } finally { setSaving(false); } }

  return <div className="page-shell">
    <header className="page-header"><p className="eyebrow">Access control</p><h1>User management</h1><p>Invite demonstration users, assign roles, and disable accounts without deleting history.</p></header>
    <div className="mb-4 flex justify-end"><button className="action-button" onClick={() => { setMessage(null); setShowInvite(true); }}>Invite user</button></div>
    {state === "loading" && <div className="surface-card p-5 text-sm text-neutral-600">Loading users...</div>}
    {state === "error" && <div className="empty-state" role="alert">Users could not be loaded. <button className="underline" onClick={() => void load()}>Try again</button></div>}
    {state === "ready" && users.length === 0 && <div className="empty-state">No users found.</div>}
    {state === "ready" && users.length > 0 && <div className="surface-card overflow-hidden"><table className="data-table data-table--responsive"><thead><tr><th>User</th><th>Phone</th><th>Roles</th><th>Status</th><th>Joined</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td data-label="User"><strong>{user.displayName ?? "Unnamed user"}</strong><span className="block text-xs text-neutral-500">{user.email}</span></td><td data-label="Phone">{user.phone ?? "Not provided"}</td><td data-label="Roles"><div className="flex flex-wrap gap-1">{user.roles.map((role) => <span key={role} className="status-chip status-chip--neutral">{role.replaceAll("_", " ")}</span>)}</div></td><td data-label="Status"><span className={`status-chip status-chip--${user.status === "ACTIVE" ? "success" : user.status === "INVITED" ? "warning" : "neutral"}`}>{user.status}</span></td><td data-label="Joined">{new Date(user.createdAt).toLocaleDateString()}</td><td data-label="Action"><button className="text-sm font-bold text-emerald-800 underline" onClick={() => { setActive(user); setSelectedRoles(user.roles); setMessage(null); }}>Manage</button></td></tr>)}</tbody></table></div>}
    <Modal title="Invite user" description="The free configured email sender will deliver the account invitation when SMTP is available." open={showInvite} onClose={() => setShowInvite(false)}>
      <form className="form-stack" onSubmit={invite}><label className="form-field">Full name<input name="displayName" required minLength={2} /></label><label className="form-field">Email<input name="email" type="email" required /></label><label className="form-field">Initial role<select name="role" defaultValue="TENANT">{ROLES.map((role) => <option key={role}>{role}</option>)}</select></label>{message && <div className="inline-feedback" data-tone="error" role="alert">{message}</div>}<div className="form-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowInvite(false)}>Cancel</button><button className="action-button" disabled={saving}>{saving ? "Sending..." : "Send invitation"}</button></div></form>
    </Modal>
    <Modal title="Manage user access" description={active?.email} open={Boolean(active)} onClose={() => setActive(null)}>
      {active && <form className="form-stack" onSubmit={saveAccess}><label className="form-field">Account status<select name="status" defaultValue={active.status}><option value="INVITED">Invited</option><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></select></label><fieldset className="form-field"><legend>Roles</legend><div className="grid gap-2 sm:grid-cols-2">{ROLES.map((role) => <label key={role} className="flex min-h-11 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm"><input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} />{role.replaceAll("_", " ")}</label>)}</div></fieldset>{message && <div className="inline-feedback" data-tone="error" role="alert">{message}</div>}<div className="form-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setActive(null)}>Cancel</button><button className="action-button" disabled={saving || selectedRoles.length === 0}>{saving ? "Saving..." : "Save access"}</button></div></form>}
    </Modal>
  </div>;
}
