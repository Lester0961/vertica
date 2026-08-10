"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/design-system/Modal";
import { Input } from "@/components/design-system/Input";
import { formatPeso } from "@/lib/utils/format";

export interface ManagedLease { id: string; publicLabel: string; tenantName: string | null; startDate: string; endDate: string; monthlyRent: number; status: string; }
type Action = { type: "renew" | "terminate"; lease: ManagedLease } | null;

function nextDate(date: string) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function LeaseManager({ leases }: { leases: ManagedLease[] }) {
  const router = useRouter();
  const [action, setAction] = useState<Action>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    setSaving(true);
    setNotice(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = action.type === "terminate" ? { reason: values.reason } : { startDate: values.startDate, endDate: values.endDate, monthlyRent: Number(values.monthlyRent), advanceAmount: Number(values.advanceAmount), depositAmount: Number(values.depositAmount) };
    try {
      const response = await fetch(`/api/v1/leases/${action.lease.id}/${action.type}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message ?? "The lease could not be updated.");
      setNotice(action.type === "renew" ? "Renewal created and checked against the demo policy rules." : "Lease terminated and unit returned to available inventory.");
      setAction(null);
      router.refresh();
    } catch (error) { setNotice((error as Error).message); } finally { setSaving(false); }
  }

  if (!leases.length) return <div className="empty-state">No active leases.</div>;
  return <>
    {notice && <p className="mb-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm" role="status">{notice}</p>}
    <div className="surface-card overflow-hidden"><table className="data-table data-table--responsive"><thead><tr><th>Unit</th><th>Tenant</th><th>Period</th><th>Rent</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{leases.map((lease) => <tr key={lease.id}><td data-label="Unit" className="font-semibold">{lease.publicLabel}</td><td data-label="Tenant">{lease.tenantName ?? "Resident"}</td><td data-label="Period">{new Date(lease.startDate).toLocaleDateString("en-PH")} - {new Date(lease.endDate).toLocaleDateString("en-PH")}</td><td data-label="Rent" className="tabular">{formatPeso(lease.monthlyRent)}</td><td data-label="Status"><span className="status-chip status-chip--success">{lease.status}</span></td><td data-label="Actions"><div className="flex flex-wrap gap-3"><button className="text-sm font-semibold text-emerald-800 underline" onClick={() => setAction({ type: "renew", lease })}>Renew</button><button className="text-sm font-semibold text-red-700 underline" onClick={() => setAction({ type: "terminate", lease })}>Terminate</button></div></td></tr>)}</tbody></table></div>
    <Modal open={!!action} onClose={() => setAction(null)} title={action?.type === "renew" ? `Renew ${action.lease.publicLabel}` : `Terminate ${action?.lease.publicLabel ?? "lease"}`}>
      {action && <form className="space-y-4" onSubmit={submit}>{action.type === "renew" ? <><p className="text-sm text-neutral-600">The proposed renewal is checked against the effective-dated educational demo rules before it is saved.</p><div className="grid gap-3 sm:grid-cols-2"><Input label="Start date" name="startDate" type="date" defaultValue={nextDate(action.lease.endDate)} required /><Input label="End date" name="endDate" type="date" required /></div><Input label="Monthly rent (PHP)" name="monthlyRent" type="number" defaultValue={String(action.lease.monthlyRent)} required /><div className="grid gap-3 sm:grid-cols-2"><Input label="Advance (PHP)" name="advanceAmount" type="number" defaultValue={String(action.lease.monthlyRent)} required /><Input label="Deposit (PHP)" name="depositAmount" type="number" defaultValue={String(action.lease.monthlyRent * 2)} required /></div></> : <><p className="text-sm text-neutral-600">This closes the active lease and makes the unit available again. The history remains in the audit trail.</p><label className="block text-sm font-semibold">Reason<textarea name="reason" required minLength={3} className="mt-1 block min-h-24 w-full rounded-md border border-neutral-300 px-3 py-2" /></label></>}<div className="flex justify-end gap-3"><button type="button" className="rounded-md px-3 py-2 text-sm font-semibold" onClick={() => setAction(null)}>Cancel</button><button disabled={saving} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : action.type === "renew" ? "Create renewal" : "Terminate lease"}</button></div></form>}
    </Modal>
  </>;
}
