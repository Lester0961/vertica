import { requirePageRole } from "@/lib/security/guard";
import { getAllMaintenanceRequests } from "@/features/maintenance/queries";

export const dynamic = "force-dynamic";

export default async function MaintenanceAssignedPage() {
  await requirePageRole(["MAINTENANCE", "SUPER_ADMIN", "PROPERTY_ADMIN"]);
  const requests = await getAllMaintenanceRequests();
  const open = requests.filter((r) => !["CLOSED", "COMPLETED", "CANCELLED"].includes(r.status));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Maintenance queue</h1>
      <p className="mt-1 text-neutral-600">{open.length} open request{open.length === 1 ? "" : "s"}.</p>

      <div className="mt-6 space-y-3">
        {open.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-neutral-500">
            Inbox zero. Nothing pending.
        </p>
        ) : (
          open.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900">
                  {r.unitLabel} · {r.category}
              </span>
                <span className={"rounded-full px-2 py-0.5 text-xs font-medium " +
                  (r.isSafety ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-600")}>
                  {r.status}{r.isSafety ? " · ⚠" : ""}
              </span>
            </div>
              <p className="mt-1 text-sm text-neutral-600">
                {r.priority} priority{r.tenantName ? ` · ${r.tenantName}` : ""}
            </p>
              <p className="mt-1 text-sm text-neutral-500">{r.description}</p>
              <p className="mt-1 text-xs text-neutral-400">
                Submitted {new Date(r.createdAt).toLocaleString()}
            </p>
          </div>
          ))
        )}
    </div>
  </div>
  );
}
