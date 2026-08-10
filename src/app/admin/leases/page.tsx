import { CreateLeaseForm } from "@/components/staff/CreateLeaseForm";
import { LeaseManager } from "@/components/staff/LeaseManager";
import { getActiveLeases, getAvailableUnitsForLease, getLegalConfigurationStatus } from "@/features/staff/queries";
import { requirePageRole } from "@/lib/security/guard";
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh";

export const dynamic = "force-dynamic";

export default async function AdminLeasesPage() {
  await requirePageRole(["SUPER_ADMIN", "PROPERTY_ADMIN"], "/admin/leases");
  const [leases, units, legal] = await Promise.all([getActiveLeases(), getAvailableUnitsForLease(), getLegalConfigurationStatus()]);
  return <div className="page-shell space-y-8">
    <RealtimeRefresh tables={["units"]} />
    <header className="page-header"><p className="eyebrow">Residency</p><h1>Lease management</h1><p>Create, renew, and close agreements with effective-dated demo policy checks.</p></header>
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950" role="note"><strong>Educational simulation.</strong> Lease amounts are checked against the active classroom demo ruleset ({legal.version ?? "not configured"}). This feature is for system demonstration, not professional advice.</div>
    {!legal.ready && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert"><strong>Lease creation is temporarily unavailable.</strong> Activate the seeded demo policy configuration to use this workflow.</div>}
    <CreateLeaseForm units={units} legalReady={legal.ready} />
    <section aria-labelledby="active-leases-title"><h2 id="active-leases-title" className="mb-3 text-lg font-bold">Active leases</h2><LeaseManager leases={leases} /></section>
  </div>;
}
