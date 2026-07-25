import { requirePageRole } from "@/lib/security/guard";
import { getMyMaintenanceRequests } from "@/features/maintenance/queries";
import { MaintenanceForm } from "@/components/maintenance/MaintenanceForm";

export const dynamic = "force-dynamic";

export default async function TenantMaintenancePage() {
  await requirePageRole(["TENANT"]);
  const requests = await getMyMaintenanceRequests();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Maintenance</h1>
      <p className="mt-1 text-neutral-600">
        Submit a request and our maintenance team will respond. Safety issues are flagged
        for priority handling.
     </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Your requests</h2>
          {requests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-neutral-500">
              No maintenance requests yet.
           </p>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">{r.category}</span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                      {r.status}
                   </span>
                 </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    {r.priority} priority{r.isSafety ? " · ⚠ safety" : ""}
                 </p>
                  <p className="mt-1 text-sm text-neutral-500">{r.description}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Submitted {new Date(r.createdAt).toLocaleString()}
                 </p>
                  {r.resolution && (
                    <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
                      Resolution: {r.resolution}
                   </p>
                  )}
               </li>
              ))}
           </ul>
          )}
       </section>

        <section>
          <MaintenanceForm />
       </section>
     </div>
   </div>
  );
}
