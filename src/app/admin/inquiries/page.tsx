"use client";

import { useEffect, useState } from "react";

interface Inquiry {
  id: string;
  fullName: string;
  email: string;
  status: string;
  summary: string;
  createdAt: string;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/inquiries")
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.ok) setInquiries(json.data.inquiries ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Inquiries</h1>
      {loading ? <p className="text-sm text-neutral-500">Loading...</p> : inquiries.length === 0 ? (
        <p className="text-sm text-neutral-500">No inquiries yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-2 font-medium text-neutral-600">Name</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Email</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Status</th>
                <th className="px-4 py-2 font-medium text-neutral-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {inquiries.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2 font-medium text-neutral-900">{i.fullName}</td>
                  <td className="px-4 py-2 text-neutral-600">{i.email}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{i.status}</span>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{new Date(i.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
