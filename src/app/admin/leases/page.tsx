"use client";

import { useEffect, useState } from "react";

interface Lease {
  id: string;
  unitLabel: string;
  tenantName: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
}

export default function AdminLeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/leases/active")
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.ok) setLeases(json.data.leases ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Active Leases</h1>
      {loading && <p className="text-sm text-neutral-500">Loading...</p>}
      {!loading && leases.length === 0 && <p className="text-sm text-neutral-500">No active leases.</p>}
      {!loading && leases.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-2 font-medium text-neutral-600">Unit</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Tenant</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Status</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Period</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Rent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {leases.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2 font-medium text-neutral-900">{l.unitLabel}</td>
                  <td className="px-4 py-2 text-neutral-600">{l.tenantName ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{l.status}</span>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-neutral-600">₱{l.monthlyRent?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
