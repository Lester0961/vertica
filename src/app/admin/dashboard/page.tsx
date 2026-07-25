"use client";

import { useEffect, useState } from "react";

interface Stats {
  availableUnits: number;
  newInquiries: number;
  pendingReservations: number;
  activeLeases: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/v1/reports/occupancy").then((r) => r.json()),
      fetch("/api/v1/reports/financial").then((r) => r.json()),
    ]).then(([occ, fin]) => {
      if (!cancelled) {
        setStats({
          availableUnits: occ.data?.byStatus?.find((s: { status: string }) => s.status === "AVAILABLE")?.count ?? 0,
          newInquiries: 0,
          pendingReservations: 0,
          activeLeases: 0,
        });
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Admin Dashboard</h1>
      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="text-sm text-neutral-500">Available units</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">{stats.availableUnits}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="text-sm text-neutral-500">Quick links</div>
            <div className="mt-2 space-y-1 text-sm">
              <a href="/admin/reports" className="block text-blue-600 hover:underline">Reports & Analytics</a>
              <a href="/admin/announcements" className="block text-blue-600 hover:underline">Announcements</a>
              <a href="/admin/users" className="block text-blue-600 hover:underline">User management</a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
