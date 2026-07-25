"use client";

import { useEffect, useState } from "react";

interface GatePass {
  id: string;
  unitLabel: string;
  validFrom: string;
  validTo: string;
  status: string;
  maxUses: number;
  useCount: number;
  createdAt: string;
  visitors: { visitorName: string; vehiclePlate: string | null }[];
}

export default function AdminGatePassesPage() {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/v1/gate-passes")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setPasses(json.data.passes ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? passes : passes.filter((p) => p.status === filter);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">All Gate Passes</h1>

      <div className="flex gap-2">
        {["ALL", "ACTIVE", "USED", "EXPIRED", "REVOKED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === s ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {s} {s !== "ALL" && `(${passes.filter((p) => p.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">No gate passes found.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-2 font-medium text-neutral-600">Unit</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Status</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Valid</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Uses</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Visitors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-medium text-neutral-900">{p.unitLabel}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                      p.status === "USED" ? "bg-blue-100 text-blue-700" :
                      p.status === "REVOKED" ? "bg-red-100 text-red-700" :
                      "bg-neutral-100 text-neutral-600"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {new Date(p.validFrom).toLocaleDateString()} – {new Date(p.validTo).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{p.useCount}/{p.maxUses}</td>
                  <td className="px-4 py-2 text-neutral-500">
                    {p.visitors.map((v) => v.visitorName).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
