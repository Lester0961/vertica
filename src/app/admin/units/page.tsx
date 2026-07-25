"use client";

import { useEffect, useState } from "react";

interface Unit {
  id: string;
  public_label: string;
  status: string;
  unit_type_code: string;
  monthly_rent: number;
}

export default function AdminUnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/public/units")
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.ok) setUnits(json.data.units ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Units</h1>
      {loading ? <p className="text-sm text-neutral-500">Loading...</p> : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-2 font-medium text-neutral-600">Unit</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Type</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Status</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Rent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {units.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-medium text-neutral-900">{u.public_label}</td>
                  <td className="px-4 py-2 text-neutral-600">{u.unit_type_code}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === "AVAILABLE" ? "bg-green-100 text-green-700" :
                      u.status === "OCCUPIED" ? "bg-blue-100 text-blue-700" :
                      "bg-neutral-100 text-neutral-600"
                    }`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-2 text-neutral-600">₱{u.monthly_rent?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
