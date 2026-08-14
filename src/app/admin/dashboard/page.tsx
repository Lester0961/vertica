"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRealtimeTables } from "@/components/realtime/RealtimeRefresh";
import { formatPeso } from "@/lib/utils/format";

type OccupancyReport = {
  totalUnits: number;
  occupancyRate: number;
  byStatus: { status: string; count: number }[];
};

type FinancialReport = {
  totalOutstanding: number;
  collectionRate: number;
};

type MaintenanceReport = {
  openBacklog: number;
};

type DashboardData = {
  occupancy: OccupancyReport;
  financial: FinancialReport;
  maintenance: MaintenanceReport;
};

const QUICK_LINKS = [
  { href: "/admin/units", label: "Manage units", description: "Inventory, status, and public availability" },
  { href: "/admin/payments", label: "Review payments", description: "Verify resident submissions" },
  { href: "/admin/maintenance", label: "Coordinate service", description: "Move requests through the work lifecycle" },
  { href: "/admin/reports", label: "Open reports", description: "Occupancy, financial, service, and access summaries" },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try {
      const responses = await Promise.all([
        fetch("/api/v1/reports/occupancy", { cache: "no-store" }),
        fetch("/api/v1/reports/financial", { cache: "no-store" }),
        fetch("/api/v1/reports/maintenance", { cache: "no-store" }),
      ]);
      const [occupancy, financial, maintenance] = await Promise.all(responses.map((response) => response.json()));
      if (responses.some((response) => !response.ok) || !occupancy.ok || !financial.ok || !maintenance.ok) throw new Error();
      setData({ occupancy: occupancy.data, financial: financial.data, maintenance: maintenance.data });
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useRealtimeTables(["units", "bills", "maintenance_requests"], load);

  const available = data?.occupancy.byStatus.find((item) => item.status === "AVAILABLE")?.count ?? 0;
  const occupied = data?.occupancy.byStatus.find((item) => item.status === "OCCUPIED")?.count ?? 0;

  return (
    <div className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Property operations</p>
        <h1>Administration overview</h1>
        <p>Live signals from inventory, billing, and maintenance. Each figure is drawn from the current property record.</p>
      </header>

      {state === "loading" && <p className="text-sm text-neutral-500" role="status">Loading current operations...</p>}
      {state === "error" && <div className="empty-state" role="alert">Dashboard data could not be loaded. <button type="button" className="text-sm font-semibold text-emerald-800 underline underline-offset-4" onClick={() => void load()}>Try again</button></div>}
      {state === "ready" && data && <>
        <section className="metric-grid" aria-label="Current property metrics">
          <article className="metric-card"><p>Available residences</p><strong>{available}</strong><span>of {data.occupancy.totalUnits} total homes</span></article>
          <article className="metric-card"><p>Occupied homes</p><strong>{occupied}</strong><span>{data.occupancy.occupancyRate}% occupancy</span></article>
          <article className="metric-card"><p>Outstanding ledger</p><strong>{formatPeso(data.financial.totalOutstanding)}</strong><span>{data.financial.collectionRate}% collected</span></article>
          <article className="metric-card"><p>Open service work</p><strong>{data.maintenance.openBacklog}</strong><span>requests in the active queue</span></article>
        </section>

        <section className="mt-7">
          <div className="mb-3"><p className="eyebrow">Operations shortcuts</p><h2 className="mt-1 text-lg font-bold">Go directly to the work</h2></div>
          <div className="workflow-grid">
            {QUICK_LINKS.map((link, index) => <Link key={link.href} href={link.href} className="workflow-card"><div><span className="workflow-card__index">0{index + 1}</span><h2>{link.label}</h2><p>{link.description}</p></div><span className="workflow-card__link">Open workspace →</span></Link>)}
          </div>
        </section>
      </>}
    </div>
  );
}
