"use client";

export default function AdminTenantsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-900">Tenants</h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        Tenant records are created automatically when leases are signed via <a href="/admin/leases" className="text-blue-600 hover:underline">Leases</a>.
      </div>
    </div>
  );
}
