import { requirePageRole } from "@/lib/security/guard";
import { getAllMaintenanceRequests } from "@/features/maintenance/queries";

export const dynamic = "force-dynamic";
export default async function MaintenanceCompletedPage() {
  await requirePageRole(["MAINTENANCE", "SUPER_ADMIN", "PROPERTY_ADMIN"]);
  const requests = await getAllMaintenanceRequests();
  const completed = requests.filter((request) => ["COMPLETED", "CLOSED", "CANCELLED", "REJECTED"].includes(request.status));
  return <div className="page-shell"><header className="page-header"><p className="eyebrow">Service history</p><h1>Completed work</h1><p>Closed, completed, cancelled, and rejected requests.</p></header>{completed.length === 0 ? <div className="empty-state">There is no completed service history yet.</div> : <div className="grid gap-3">{completed.map((request) => <article className="surface-card p-5" key={request.id}><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{request.unitLabel} · {request.category}</p><h2 className="mt-1 text-base font-bold">{request.tenantName ?? "Resident"}</h2></div><span className="status-chip status-chip--success">{request.status}</span></div><p className="mt-3 text-sm text-neutral-600">{request.description}</p>{request.resolution && <p className="mt-4 border-t border-neutral-200 pt-3 text-sm text-neutral-700"><strong>Resolution:</strong> {request.resolution}</p>}</article>)}</div>}</div>;
}
