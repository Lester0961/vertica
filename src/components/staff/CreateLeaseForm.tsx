"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/design-system/Input";
import { createLeaseAction } from "@/features/staff/actions.server";

interface UnitOption {
  id: string;
  publicLabel: string;
  unitTypeName: string;
  monthlyRent: number;
}

export function CreateLeaseForm({ units, legalReady }: { units: UnitOption[]; legalReady: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const form = event.currentTarget;
    const result = await createLeaseAction(new FormData(form));
    if (result.ok) {
      setSuccess(`Lease created (${result.leaseId.slice(0, 8)}). Unit is now occupied.`);
      form.reset();
      router.refresh();
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  return <form className="surface-card space-y-4 p-5 sm:p-6" onSubmit={submit}>
    <h2 className="text-lg font-semibold text-neutral-900">Create a lease</h2>
    <label className="block"><span className="mb-1 block text-sm font-medium text-neutral-600">Unit</span><select name="unitId" required className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"><option value="">Select an available unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.publicLabel} - {unit.unitTypeName} (PHP {unit.monthlyRent.toLocaleString()}/mo)</option>)}</select></label>
    <Input label="Tenant name" name="tenantName" required />
    <div className="grid gap-3 sm:grid-cols-2"><Input label="Tenant email" name="tenantEmail" type="email" required /><Input label="Tenant phone" name="tenantPhone" type="tel" /></div>
    <div className="grid gap-3 sm:grid-cols-2"><Input label="Start date" name="startDate" type="date" required /><Input label="End date" name="endDate" type="date" required /></div>
    <div className="grid gap-3 sm:grid-cols-3"><Input label="Monthly rent (PHP)" name="monthlyRent" type="number" inputMode="numeric" required /><Input label="Advance (PHP)" name="advanceAmount" type="number" inputMode="numeric" required /><Input label="Deposit (PHP)" name="depositAmount" type="number" inputMode="numeric" required /></div>
    <Input label="Document path (optional)" name="documentPath" />
    <button type="submit" disabled={loading || !legalReady} className="w-full rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{loading ? "Creating..." : legalReady ? "Create lease" : "Demo policy configuration unavailable"}</button>
    {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{success}</p>}
  </form>;
}
