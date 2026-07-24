"use client";

import { useState } from "react";
import { Input } from "@/components/design-system/Input";
import { createLeaseAction } from "@/features/staff/actions.server";

interface UnitOption {
  id: string;
  publicLabel: string;
  unitTypeName: string;
  monthlyRent: number;
}

export function CreateLeaseForm({ units }: { units: UnitOption[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const result = await createLeaseAction(new FormData(form));
    if (result.ok) setSuccess(`Lease created (${result.leaseId.slice(0, 8)}). Unit is now LEASED.`);
    else setError(result.error);
    setLoading(false);
  };

  return (
    <form className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6" onSubmit={submit}>
      <h2 className="text-lg font-semibold text-neutral-900">Create a lease</h2>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-600">Unit</span>
        <select name="unitId" required className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="">Select an available unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.publicLabel} — {u.unitTypeName} (₱{u.monthlyRent.toLocaleString()}/mo)
            </option>
          ))}
        </select>
      </label>

      <Input label="Tenant name" name="tenantName" required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Tenant email" name="tenantEmail" type="email" />
        <Input label="Tenant phone" name="tenantPhone" type="tel" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Start date" name="startDate" type="date" required />
        <Input label="End date" name="endDate" type="date" required />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input label="Monthly rent (₱)" name="monthlyRent" type="number" inputMode="numeric" required />
        <Input label="Advance (₱)" name="advanceAmount" type="number" inputMode="numeric" required />
        <Input label="Deposit (₱)" name="depositAmount" type="number" inputMode="numeric" required />
      </div>
      <Input label="Document path (optional)" name="documentPath" />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create lease"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          {success}
        </p>
      )}
    </form>
  );
}
