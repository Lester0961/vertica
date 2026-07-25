"use client";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Payments</h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        Payment records are viewable through <a href="/admin/billing" className="text-blue-600 hover:underline">Billing</a> and individual tenant accounts.
      </div>
    </div>
  );
}
