import "server-only";
import { randomUUID } from "node:crypto";
import { authenticate, type Actor } from "@/lib/security/authenticate";
import { AuthorizationError } from "@/lib/security/authenticate";
import { createServiceRoleClient } from "@/lib/supabase/service";

async function resolveTenantId(actor: Actor): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", actor.userId)
    .maybeSingle();
  if (!profile) throw new AuthorizationError(403, "No resident profile linked to this account.");
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!tenant) throw new AuthorizationError(403, "No tenant record linked to this account.");
  return tenant.id;
}

async function getTenantLeaseUnitId(actor: Actor): Promise<string> {
  const supabase = createServiceRoleClient();
  const tenantId = await resolveTenantId(actor);
  const { data: lease } = await supabase
    .from("leases")
    .select("unit_id")
    .eq("tenant_id", tenantId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!lease) throw new AuthorizationError(403, "No active lease for this tenant.");
  return lease.unit_id;
}

export interface MaintenanceRequestView {
  id: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  isSafety: boolean;
  createdAt: string;
  closedAt: string | null;
  resolution: string | null;
}

export async function getMyMaintenanceRequests(): Promise<MaintenanceRequestView[]> {
  const actor = await authenticate();
  const isTenant = !!actor && actor.roles.includes("TENANT");
  if (!isTenant) throw new AuthorizationError(403, "Tenant access only.");
  const tenantId = await resolveTenantId(actor!);
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("maintenance_requests")
    .select("id, category, priority, description, status, is_safety, created_at, closed_at, resolution")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: { id: string; category: string; priority: string; description: string; status: string; is_safety: boolean; created_at: string; closed_at: string | null; resolution: string | null }) => ({
    id: r.id,
    category: r.category,
    priority: r.priority,
    description: r.description,
    status: r.status,
    isSafety: r.is_safety,
    createdAt: r.created_at,
    closedAt: r.closed_at,
    resolution: r.resolution,
  }));
}

export interface CreateRequestInput {
  category: string;
  priority: string;
  description: string;
  isSafety: boolean;
  preferredSchedule?: { date?: string; time?: string };
}

export async function createMaintenanceRequest(input: CreateRequestInput): Promise<{ requestId: string }> {
  const actor = await authenticate();
  const isTenant = !!actor && actor.roles.includes("TENANT");
  if (!isTenant) throw new AuthorizationError(403, "Tenant access only.");
  const tenantId = await resolveTenantId(actor!);
  const unitId = await getTenantLeaseUnitId(actor!);
  const supabase = createServiceRoleClient();
  const id = randomUUID();
  const { error } = await supabase.from("maintenance_requests").insert({
    id,
    tenant_id: tenantId,
    unit_id: unitId,
    category: input.category,
    priority: input.priority,
    description: input.description,
    is_safety: input.isSafety,
    preferred_schedule: input.preferredSchedule ?? null,
    status: "SUBMITTED",
  });
  if (error) throw new Error("Could not submit request.");
  return { requestId: id };
}

// ---- Staff/admin ----

export async function getAllMaintenanceRequests(): Promise<(MaintenanceRequestView & { unitLabel: string; tenantName: string | null })[]> {
  const actor = await authenticate();
  const roles = actor?.roles ?? [];
  if (!roles.some((r) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN" || r === "MAINTENANCE")) {
    throw new AuthorizationError(403, "Staff access only.");
  }
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("maintenance_requests")
    .select("id, category, priority, description, status, is_safety, created_at, closed_at, resolution")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    category: string;
    priority: string;
    description: string;
    status: string;
    is_safety: boolean;
    created_at: string;
    closed_at: string | null;
    resolution: string | null;
    unit_id: string;
    tenant_id: string | null;
  }>;
  if (!rows.length) return [];
  const [{ data: units }, { data: tenants }] = await Promise.all([
    supabase.from("units").select("id, public_label").in("id", rows.map((r) => r.unit_id)),
    supabase
      .from("tenants")
      .select("id, client_id")
      .in("id", rows.map((r) => r.tenant_id).filter(Boolean) as string[]),
  ]);
  const unitMap = new Map((units ?? []).map((u: { id: string; public_label: string }) => [u.id, u.public_label]));
  const tenantClientMap = new Map(
    (tenants ?? []).map((t: { id: string; client_id: string | null }) => [t.id, t.client_id]),
  );
  const clientIds = Array.from(tenantClientMap.values()).filter(Boolean) as string[];
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .in("id", clientIds);
  const clientMap = new Map((clients ?? []).map((c: { id: string; full_name: string }) => [c.id, c.full_name]));
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    priority: r.priority,
    description: r.description,
    status: r.status,
    isSafety: r.is_safety,
    createdAt: r.created_at,
    closedAt: r.closed_at,
    resolution: r.resolution,
    unitLabel: unitMap.get(r.unit_id) ?? "?",
    tenantName: r.tenant_id ? clientMap.get(tenantClientMap.get(r.tenant_id) ?? "") ?? null : null,
  }));
}
