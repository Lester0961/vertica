"use client";

import { useEffect, useState } from "react";

interface Bill {
  id: string;
  unitLabel: string;
  tenantName: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  dueDate: string;
}

export default function AdminBillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/billing/all/bills")
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.ok) setBills(json.data.bills ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Billing Overview</h1>
      {loading && <p className="text-sm text-neutral-500">Loading...</p>}
      {!loading && bills.length === 0 && <p className="text-sm text-neutral-500">No bills found.</p>}
      {!loading && bills.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-2 font-medium text-neutral-600">Unit</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Total</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Paid</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Balance</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Status</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2 font-medium text-neutral-900">{b.unitLabel ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-600">₱{b.totalAmount?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-green-600">₱{b.paidAmount?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-amber-600">₱{b.balance?.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.status === "PAID" ? "bg-green-100 text-green-700" :
                      b.status === "OVERDUE" ? "bg-red-100 text-red-700" :
                      "bg-neutral-100 text-neutral-600"
                    }`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{new Date(b.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
