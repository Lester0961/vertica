import { requirePageRole } from "@/lib/security/guard";
import { getActiveLeases, getAvailableUnitsForLease } from "@/features/staff/queries";
import { CreateLeaseForm } from "@/components/staff/CreateLeaseForm";

export const dynamic = "force-dynamic";

export default async function LeasesPage() {
  await requirePageRole(["SUPER_ADMIN", "PROPERTY_ADMIN"]);
  const [leases, units] = await Promise.all([getActiveLeases(), getAvailableUnitsForLease()]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Leases</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Active leases</h2>
          {leases.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-neutral-500">No leases yet.</p>
          ) : (
            <ul className="space-y-2">
              {leases.map((l) => (
                <li key={l.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">{l.publicLabel}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {l.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    {l.tenantName ?? "Unassigned"} · ₱{l.monthlyRent.toLocaleString()}/mo
                  </p>
                  <p className="text-xs text-neutral-500">
                    {l.startDate} → {l.endDate}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <CreateLeaseForm
            units={units.map((u) => ({
              id: u.id,
              publicLabel: u.publicLabel,
              unitTypeName: u.unitTypeName,
              monthlyRent: u.monthlyRent,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
