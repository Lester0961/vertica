"use client";

import { useEffect, useState } from "react";

type Tab = "occupancy" | "financial" | "maintenance" | "gate-passes";

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 text-neutral-600 truncate">{label}</span>
      <div className="flex-1 h-5 bg-neutral-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-neutral-700 font-medium">{value}</span>
    </div>
  );
}

export default function AdminReportsPage() {
  const [tab, setTab] = useState<Tab>("occupancy");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/reports/${tab}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.ok) setData(json.data);
      });
    return () => { cancelled = true; };
  }, [tab, fetchKey]);
  const loading = data === null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "occupancy", label: "Occupancy" },
    { key: "financial", label: "Financial" },
    { key: "maintenance", label: "Maintenance" },
    { key: "gate-passes", label: "Gate passes" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Reports & Analytics</h1>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t.key ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading report...</p>
      ) : !data ? (
        <p className="text-sm text-neutral-500">No data available.</p>
      ) : tab === "occupancy" ? (
        <OccupancyTab data={data as { totalUnits: number; occupancyRate: number; byStatus: { status: string; count: number }[]; byUnitType: { type: string; total: number; occupied: number; available: number }[] }} />
      ) : tab === "financial" ? (
        <FinancialTab data={data as { totalBilled: number; totalCollected: number; totalOutstanding: number; collectionRate: number; overdueCount: number; overdueAmount: number; byMonth: { month: string; billed: number; collected: number }[] }} />
      ) : tab === "maintenance" ? (
        <MaintenanceTab data={data as { totalRequests: number; openBacklog: number; closedCount: number; safetyIncidents: number; avgResolutionHours: number | null; byCategory: { category: string; count: number }[]; byPriority: { priority: string; count: number }[] }} />
      ) : (
        <GatePassTab data={data as { totalIssued: number; activeCount: number; usedCount: number; expiredCount: number; revokedCount: number; totalVerifications: number; validVerifications: number; invalidVerifications: number; utilizationRate: number }} />
      )}
    </div>
  );
}

function OccupancyTab({ data }: { data: { totalUnits: number; occupancyRate: number; byStatus: { status: string; count: number }[]; byUnitType: { type: string; total: number; occupied: number; available: number }[] } }) {
  const maxStatus = Math.max(...data.byStatus.map((s) => s.count), 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total units" value={data.totalUnits} />
        <Stat label="Occupancy rate" value={`${data.occupancyRate}%`} />
        <Stat label="Available" value={data.byStatus.find((s) => s.status === "AVAILABLE")?.count ?? 0} />
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
        <h3 className="font-medium text-neutral-900">Units by status</h3>
        {data.byStatus.map((s) => (
          <BarRow key={s.status} label={s.status} value={s.count} max={maxStatus} />
        ))}
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="font-medium text-neutral-900 mb-3">By unit type</h3>
        <table className="w-full text-sm">
          <thead className="text-neutral-500">
            <tr><th className="text-left py-1">Type</th><th className="text-right py-1">Total</th><th className="text-right py-1">Occupied</th><th className="text-right py-1">Available</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.byUnitType.map((t) => (
              <tr key={t.type}>
                <td className="py-1.5 font-medium text-neutral-800">{t.type}</td>
                <td className="py-1.5 text-right text-neutral-600">{t.total}</td>
                <td className="py-1.5 text-right text-neutral-600">{t.occupied}</td>
                <td className="py-1.5 text-right text-green-600">{t.available}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinancialTab({ data }: { data: { totalBilled: number; totalCollected: number; totalOutstanding: number; collectionRate: number; overdueCount: number; overdueAmount: number; byMonth: { month: string; billed: number; collected: number }[] } }) {
  const fmt = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const maxMonth = Math.max(...data.byMonth.map((m) => m.billed), 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total billed" value={fmt(data.totalBilled)} />
        <Stat label="Total collected" value={fmt(data.totalCollected)} />
        <Stat label="Collection rate" value={`${data.collectionRate}%`} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Outstanding balance" value={fmt(data.totalOutstanding)} />
        <Stat label="Overdue bills" value={data.overdueCount} sub={fmt(data.overdueAmount)} />
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
        <h3 className="font-medium text-neutral-900">Revenue by month</h3>
        {data.byMonth.map((m) => (
          <div key={m.month} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">{m.month}</span>
              <span className="text-neutral-500">{fmt(m.billed)} billed / {fmt(m.collected)} collected</span>
            </div>
            <div className="flex gap-1 h-4">
              <div className="bg-blue-500 rounded-l-full" style={{ width: `${(m.billed / maxMonth) * 100}%` }} />
              <div className="bg-green-500 rounded-r-full" style={{ width: `${(m.collected / maxMonth) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaintenanceTab({ data }: { data: { totalRequests: number; openBacklog: number; closedCount: number; safetyIncidents: number; avgResolutionHours: number | null; byCategory: { category: string; count: number }[]; byPriority: { priority: string; count: number }[] } }) {
  const maxCat = Math.max(...data.byCategory.map((c) => c.count), 1);
  const maxPri = Math.max(...data.byPriority.map((p) => p.count), 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Total requests" value={data.totalRequests} />
        <Stat label="Open backlog" value={data.openBacklog} />
        <Stat label="Closed" value={data.closedCount} />
        <Stat label="Safety incidents" value={data.safetyIncidents} />
      </div>
      {data.avgResolutionHours !== null && (
        <Stat label="Avg resolution time" value={`${data.avgResolutionHours}h`} />
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <h3 className="font-medium text-neutral-900">By category</h3>
          {data.byCategory.map((c) => (
            <BarRow key={c.category} label={c.category} value={c.count} max={maxCat} />
          ))}
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <h3 className="font-medium text-neutral-900">By priority</h3>
          {data.byPriority.map((p) => (
            <BarRow key={p.priority} label={p.priority} value={p.count} max={maxPri} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GatePassTab({ data }: { data: { totalIssued: number; activeCount: number; usedCount: number; expiredCount: number; revokedCount: number; totalVerifications: number; validVerifications: number; invalidVerifications: number; utilizationRate: number } }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total issued" value={data.totalIssued} />
        <Stat label="Active" value={data.activeCount} />
        <Stat label="Utilization rate" value={`${data.utilizationRate}%`} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Used" value={data.usedCount} />
        <Stat label="Expired" value={data.expiredCount} />
        <Stat label="Revoked" value={data.revokedCount} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Total verifications" value={data.totalVerifications} />
        <div className="space-y-2">
          <Stat label="Valid verifications" value={data.validVerifications} />
          <Stat label="Invalid / denied" value={data.invalidVerifications} />
        </div>
      </div>
    </div>
  );
}
