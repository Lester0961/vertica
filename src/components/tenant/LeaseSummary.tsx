"use client";

import { useEffect, useState } from "react";
import { formatPeso } from "@/lib/utils/format";

type Lease = { id: string; publicLabel: string; status: string; startDate: string; endDate: string; monthlyRent: number };

export function LeaseSummary({ mode }: { mode: "unit" | "lease" }) {
  const [lease, setLease] = useState<Lease | null | undefined>(undefined);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { let alive = true; fetch("/api/v1/leases/me").then((r) => r.json()).then((json) => { if (!alive) return; if (json.ok) { const next = json.data.lease as Lease | null; setLease(next); if (next) setDaysRemaining(Math.max(0, Math.ceil((new Date(next.endDate).getTime() - Date.now()) / 86_400_000))); } else { setError(true); setLease(null); } }).catch(() => { if (alive) { setError(true); setLease(null); } }); return () => { alive = false; }; }, []);
  if (lease === undefined) return <p className="text-sm text-neutral-500" role="status">Loading your lease…</p>;
  if (!lease) return <div className="empty-state" role={error ? "alert" : undefined}><strong>{error ? "Your lease details could not be loaded." : "No active lease is linked to your account."}</strong><span>{error ? "Refresh the page or contact the property office if the issue continues." : "Once an active lease is created, your unit and lease information will appear here."}</span></div>;
  return <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><section className="surface-card p-6"><p className="eyebrow">{mode === "unit" ? "Your residence" : "Active agreement"}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{mode === "unit" ? lease.publicLabel : "Lease details"}</h1><p className="mt-2 max-w-prose text-neutral-600">{mode === "unit" ? "This is the unit attached to your active tenancy." : "Your rental agreement and payment amount are shown below for quick reference."}</p><dl className="mt-6 grid gap-4 sm:grid-cols-2"><Detail term="Status" value={<span className="status-chip status-chip--success">{lease.status}</span>} /><Detail term="Monthly rent" value={formatPeso(lease.monthlyRent)} /><Detail term="Lease begins" value={new Date(lease.startDate).toLocaleDateString("en-PH", { dateStyle: "long" })} /><Detail term="Lease ends" value={new Date(lease.endDate).toLocaleDateString("en-PH", { dateStyle: "long" })} /></dl></section><aside className="surface-card bg-neutral-900 p-6 text-white"><p className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Lease timeline</p><p className="mt-5 text-4xl font-bold tabular">{daysRemaining ?? "—"}</p><p className="mt-1 text-sm text-neutral-300">days remaining in this agreement</p><div className="mt-6 border-t border-white/20 pt-4 text-sm text-neutral-300">For amendments, renewals, or questions about your agreement, contact the property office.</div></aside></div>;
}

function Detail({ term, value }: { term: string; value: React.ReactNode }) { return <div><dt className="text-xs font-bold uppercase tracking-wider text-neutral-500">{term}</dt><dd className="mt-1 font-semibold text-neutral-900">{value}</dd></div>; }
