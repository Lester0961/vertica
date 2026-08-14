import { MaintenanceQueue } from "@/components/maintenance/MaintenanceQueue";
import { getAllMaintenanceRequests } from "@/features/maintenance/queries";
import { requirePageRole } from "@/lib/security/guard";

export const dynamic = "force-dynamic";

export default async function MaintenanceAssignedPage() {
  await requirePageRole(["MAINTENANCE", "SUPER_ADMIN", "PROPERTY_ADMIN"]);
  const requests = await getAllMaintenanceRequests();
  return <MaintenanceQueue initialRequests={requests} />;
}
