"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPeso } from "@/lib/utils/format";
import { useRealtimeTables } from "@/components/realtime/RealtimeRefresh";

type Bill = { id: string; periodStart: string; periodEnd: string; dueDate: string | null; totalAmount: number; paidAmount: number; balance: number; status: string; items: { description: string; amount: number }[] };
type Lease = { id: string; publicLabel: string; tenantName: string | null; startDate: string; endDate: string; monthlyRent: number };
type BillPayload = { leaseId: string; periodStart: string; periodEnd: string; dueDate: string };
const money = (value: number) => formatPeso(value ?? 0);

export default function AdminBillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [state, setState] = useState("loading");
  const [filter, setFilter] = useState("ALL");
  const [showGenerate, setShowGenerate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [billResponse, leaseResponse] = await Promise.all([
      fetch("/api/v1/billing/all/bills").then((response) => response.json()),
      fetch("/api/v1/leases/active").then((response) => response.json()),
      ]);
      if (billResponse.ok) setBills(billResponse.data.bills ?? []);
      if (leaseResponse.ok) setLeases(leaseResponse.data.leases ?? []);
      setState(billResponse.ok && leaseResponse.ok ? "ready" : "error");
    } catch { setState("error"); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useRealtimeTables(["bills"], load);

  useEffect(() => {
    if (!showGenerate) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setShowGenerate(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [showGenerate]);

  const statuses = useMemo(() => ["ALL", ...Array.from(new Set(bills.map((bill) => bill.status)))], [bills]);
  const shown = filter === "ALL" ? bills : bills.filter((bill) => bill.status === filter);
  const outstanding = bills.reduce((sum, bill) => sum + bill.balance, 0);

  async function generate(payload: BillPayload) {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/billing/bills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message ?? "Bill could not be generated.");
      setMessage(`Bill ${json.data.billId.slice(0, 8)} generated for ${money(json.data.totalAmount)}.`);
      setBills((current) => [{
        id: json.data.billId,
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        dueDate: payload.dueDate,
        totalAmount: Number(json.data.totalAmount),
        paidAmount: 0,
        balance: Number(json.data.totalAmount),
        status: "ISSUED",
        items: [],
      }, ...current.filter((bill) => bill.id !== json.data.billId)]);
      setShowGenerate(false);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="page-shell">
    <header className="page-header flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Billing</p><h1>Account ledger</h1><p><strong className="tabular text-neutral-900">{money(outstanding)}</strong> outstanding across {bills.length} bill{bills.length === 1 ? "" : "s"}. Review payment submissions separately in Payments.</p></div>
      <button onClick={() => setShowGenerate(true)} disabled={leases.length === 0} className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Generate monthly bill</button>
    </header>
    {message && <p className="mb-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm" role="status">{message}</p>}
    <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter bill status">{statuses.map((status) => <button key={status} onClick={() => setFilter(status)} className={filter === status ? "rounded-full bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700"}>{status.replaceAll("_", " ")}</button>)}</div>
    {state === "loading" && <p className="text-sm text-neutral-500" role="status">Loading bills…</p>}
    {state === "error" && <div className="empty-state" role="alert">Billing data could not be loaded. Refresh to try again.</div>}
    {state === "ready" && shown.length === 0 && <div className="empty-state">{leases.length === 0 ? "Create an active lease before generating bills." : "No bills match this status filter."}</div>}
    {state === "ready" && shown.length > 0 && <div className="surface-card overflow-hidden"><table className="data-table data-table--responsive"><thead><tr><th>Billing period</th><th>Due date</th><th>Total</th><th>Received</th><th>Balance</th><th>Status</th></tr></thead><tbody>{shown.map((bill) => <tr key={bill.id}><td data-label="Billing period"><strong>{new Date(bill.periodStart).toLocaleDateString()}</strong><br /><span className="text-xs text-neutral-500">to {new Date(bill.periodEnd).toLocaleDateString()}</span></td><td data-label="Due date">{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "—"}</td><td data-label="Total" className="tabular">{money(bill.totalAmount)}</td><td data-label="Received" className="tabular text-emerald-800">{money(bill.paidAmount)}</td><td data-label="Balance" className="tabular font-semibold">{money(bill.balance)}</td><td data-label="Status"><span className={`status-chip status-chip--${bill.status === "OVERDUE" ? "danger" : bill.status === "PAID" ? "success" : "neutral"}`}>{bill.status.replaceAll("_", " ")}</span></td></tr>)}</tbody></table></div>}

    {showGenerate && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="generate-bill-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowGenerate(false); }}>
      <form onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void generate({ leaseId: String(data.get("leaseId") ?? ""), periodStart: String(data.get("periodStart") ?? ""), periodEnd: String(data.get("periodEnd") ?? ""), dueDate: String(data.get("dueDate") ?? "") });
      }} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 id="generate-bill-title" className="text-lg font-bold">Generate monthly bill</h2>
        <p className="mt-1 text-sm text-neutral-600">Rent and current association dues are read from the active lease and unit.</p>
        <label className="mt-5 block text-sm font-semibold">Lease<select name="leaseId" defaultValue={leases[0]?.id ?? ""} required className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"><option value="">Select lease</option>{leases.map((lease) => <option key={lease.id} value={lease.id}>{lease.publicLabel} — {lease.tenantName ?? "Resident"}</option>)}</select></label>
        <div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="text-sm font-semibold">Period start<input name="periodStart" type="date" required className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" /></label><label className="text-sm font-semibold">Period end<input name="periodEnd" type="date" required className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" /></label><label className="text-sm font-semibold">Due date<input name="dueDate" type="date" required className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" /></label></div>
        <p className="mt-3 text-xs text-neutral-500">The configured billing rule requires payment within the first five days of the billing period.</p>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowGenerate(false)} className="rounded-md px-3 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Generating…" : "Generate bill"}</button></div>
      </form>
    </div>}
  </div>;
}
