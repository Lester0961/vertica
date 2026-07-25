"use client";

import { useEffect, useState } from "react";

interface Verification {
  id: string;
  gatePassId: string | null;
  guardId: string;
  result: string;
  denialReason: string | null;
  verifiedAt: string;
}

export default function GuardRecentVerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/gate-passes/verifications")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setVerifications(json.data.verifications ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Recent Verifications</h1>
      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : verifications.length === 0 ? (
        <p className="text-sm text-neutral-500">No verifications yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-2 font-medium text-neutral-600">Time</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Result</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {verifications.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2 text-neutral-700">{new Date(v.verifiedAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      v.result === "VALID"
                        ? "bg-green-100 text-green-700"
                        : v.result === "NOT_FOUND"
                        ? "bg-neutral-100 text-neutral-600"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {v.result}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{v.denialReason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
