import { createServiceRoleClient } from "@/lib/supabase/service";
import { authenticate } from "@/lib/security/authenticate";
import { AuthorizationError } from "@/lib/security/authenticate";

async function requireAdmin() {
  const actor = await authenticate();
  const roles = actor?.roles ?? [];
  if (!roles.some((r: string) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  return createServiceRoleClient();
}

export interface OccupancyReport {
  totalUnits: number;
  byStatus: { status: string; count: number }[];
  occupancyRate: number;
  byUnitType: { type: string; total: number; occupied: number; available: number }[];
}

export interface FinancialReport {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  overdueCount: number;
  overdueAmount: number;
  byMonth: { month: string; billed: number; collected: number }[];
}

export interface MaintenanceReport {
  totalRequests: number;
  openBacklog: number;
  closedCount: number;
  safetyIncidents: number;
  avgResolutionHours: number | null;
  byCategory: { category: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

export interface GatePassReport {
  totalIssued: number;
  activeCount: number;
  usedCount: number;
  expiredCount: number;
  revokedCount: number;
  totalVerifications: number;
  validVerifications: number;
  invalidVerifications: number;
  utilizationRate: number;
}

export async function getOccupancyReport(): Promise<OccupancyReport> {
  const supabase = await requireAdmin();
  const { data: units } = await supabase
    .from("units").select("id, status, unit_type_id");
  const { data: unitTypes } = await supabase
    .from("unit_types").select("id, name");
  const typeMap = new Map((unitTypes ?? []).map((t: { id: string; name: string }) => [t.id, t.name]));
  const rows = (units ?? []) as unknown as { id: string; status: string; unit_type_id: string }[];
  const totalUnits = rows.length;
  const statusCounts = new Map<string, number>();
  for (const r of rows) statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1);
  const byStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));
  const occupied = statusCounts.get("OCCUPIED") ?? 0;
  const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 10000) / 100 : 0;
  const typeStats = new Map<string, { total: number; occupied: number; available: number }>();
  for (const r of rows) {
    const typeName = typeMap.get(r.unit_type_id) ?? "Unknown";
    const stats = typeStats.get(typeName) ?? { total: 0, occupied: 0, available: 0 };
    stats.total++;
    if (r.status === "OCCUPIED") stats.occupied++;
    if (r.status === "AVAILABLE") stats.available++;
    typeStats.set(typeName, stats);
  }
  const byUnitType = Array.from(typeStats.entries()).map(([type, s]) => ({ type, ...s }));
  return { totalUnits, byStatus, occupancyRate, byUnitType };
}

export async function getFinancialReport(): Promise<FinancialReport> {
  const supabase = await requireAdmin();
  const { data: bills } = await supabase
    .from("bills").select("id, total_amount, paid_amount, balance, status, period_start, due_date");
  const rows = (bills ?? []) as unknown as {
    id: string; total_amount: number; paid_amount: number; balance: number;
    status: string; period_start: string; due_date: string;
  }[];
  const totalBilled = rows.reduce((s, r) => s + (r.total_amount ?? 0), 0);
  const totalCollected = rows.reduce((s, r) => s + (r.paid_amount ?? 0), 0);
  const totalOutstanding = rows.reduce((s, r) => s + (r.balance ?? 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 10000) / 100 : 0;
  const overdue = rows.filter((r) => r.status === "OVERDUE" || (r.balance > 0 && new Date(r.due_date) < new Date()));
  const overdueCount = overdue.length;
  const overdueAmount = overdue.reduce((s, r) => s + (r.balance ?? 0), 0);
  const monthMap = new Map<string, { billed: number; collected: number }>();
  for (const r of rows) {
    const month = r.period_start?.slice(0, 7) ?? "Unknown";
    const m = monthMap.get(month) ?? { billed: 0, collected: 0 };
    m.billed += r.total_amount ?? 0;
    m.collected += r.paid_amount ?? 0;
    monthMap.set(month, m);
  }
  const byMonth = Array.from(monthMap.entries())
    .map(([month, m]) => ({ month, ...m }))
    .sort((a, b) => a.month.localeCompare(b.month));
  return { totalBilled, totalCollected, totalOutstanding, collectionRate, overdueCount, overdueAmount, byMonth };
}

export async function getMaintenanceReport(): Promise<MaintenanceReport> {
  const supabase = await requireAdmin();
  const { data: requests } = await supabase
    .from("maintenance_requests")
    .select("id, category, priority, status, is_safety, created_at, closed_at");
  const rows = (requests ?? []) as unknown as {
    id: string; category: string; priority: string; status: string;
    is_safety: boolean; created_at: string; closed_at: string | null;
  }[];
  const closedStatuses = ["COMPLETED", "CLOSED", "REJECTED", "CANCELLED"];
  const openStatuses = ["SUBMITTED", "TRIAGED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "ON_HOLD"];
  const closedRows = rows.filter((r) => closedStatuses.includes(r.status));
  const resolutionTimes = closedRows
    .filter((r) => r.closed_at)
    .map((r) => (new Date(r.closed_at!).getTime() - new Date(r.created_at).getTime()) / 3600000);
  const avgResolutionHours = resolutionTimes.length > 0
    ? Math.round(resolutionTimes.reduce((s, t) => s + t, 0) / resolutionTimes.length * 10) / 10
    : null;
  const catMap = new Map<string, number>();
  const priMap = new Map<string, number>();
  for (const r of rows) {
    catMap.set(r.category, (catMap.get(r.category) ?? 0) + 1);
    priMap.set(r.priority, (priMap.get(r.priority) ?? 0) + 1);
  }
  return {
    totalRequests: rows.length,
    openBacklog: rows.filter((r) => openStatuses.includes(r.status)).length,
    closedCount: closedRows.length,
    safetyIncidents: rows.filter((r) => r.is_safety).length,
    avgResolutionHours,
    byCategory: Array.from(catMap.entries()).map(([category, count]) => ({ category, count })),
    byPriority: Array.from(priMap.entries()).map(([priority, count]) => ({ priority, count })),
  };
}

export async function getGatePassReport(): Promise<GatePassReport> {
  const supabase = await requireAdmin();
  const { data: passes } = await supabase
    .from("gate_passes").select("id, status, use_count, max_uses");
  const { data: verifications } = await supabase
    .from("gate_pass_verifications").select("id, result");
  const passRows = (passes ?? []) as unknown as { id: string; status: string; use_count: number; max_uses: number }[];
  const verifyRows = (verifications ?? []) as unknown as { id: string; result: string }[];
  const statusMap = new Map<string, number>();
  for (const r of passRows) statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
  const totalMaxUses = passRows.reduce((s, r) => s + r.max_uses, 0);
  const totalUseCount = passRows.reduce((s, r) => s + r.use_count, 0);
  const utilizationRate = totalMaxUses > 0 ? Math.round((totalUseCount / totalMaxUses) * 10000) / 100 : 0;
  const verifyResultMap = new Map<string, number>();
  for (const r of verifyRows) verifyResultMap.set(r.result, (verifyResultMap.get(r.result) ?? 0) + 1);
  return {
    totalIssued: passRows.length,
    activeCount: statusMap.get("ACTIVE") ?? 0,
    usedCount: statusMap.get("USED") ?? 0,
    expiredCount: statusMap.get("EXPIRED") ?? 0,
    revokedCount: statusMap.get("REVOKED") ?? 0,
    totalVerifications: verifyRows.length,
    validVerifications: verifyResultMap.get("VALID") ?? 0,
    invalidVerifications: (verifyResultMap.get("INVALID") ?? 0) + (verifyResultMap.get("EXPIRED") ?? 0) + (verifyResultMap.get("REVOKED") ?? 0) + (verifyResultMap.get("NOT_FOUND") ?? 0),
    utilizationRate,
  };
}
