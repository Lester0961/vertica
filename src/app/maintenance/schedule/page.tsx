import { requirePageRole } from "@/lib/security/guard";
import { getAllMaintenanceRequests } from "@/features/maintenance/queries";

export const dynamic = "force-dynamic";
export default async function MaintenanceSchedulePage() {
  await requirePageRole(["MAINTENANCE", "SUPER_ADMIN", "PROPERTY_ADMIN"]);
  const requests = await getAllMaintenanceRequests();
  const scheduled = requests.filter((request) => ["ASSIGNED", "SCHEDULED", "IN_PROGRESS"].includes(request.status));
  return <div className="page-shell"><header className="page-header"><p className="eyebrow">Work planning</p><h1>Schedule</h1><p>Requests that are assigned, scheduled, or currently in progress.</p></header>{scheduled.length === 0 ? <div className="empty-state">No scheduled maintenance work at this time.</div> : <div className="grid gap-3">{scheduled.map((request) => <article className="surface-card p-5" key={request.id}><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{request.unitLabel} · {request.category}</p><h2 className="mt-1 text-base font-bold">{request.tenantName ?? "Resident"}</h2></div><span className="status-chip status-chip--warning">{request.status.replaceAll("_", " ")}</span></div><p className="mt-3 text-sm text-neutral-600">{request.description}</p></article>)}</div>}</div>;
}
