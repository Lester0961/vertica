import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export interface DashboardStats {
  availableUnits: number;
  newInquiries: number;
  pendingReservations: number;
  activeLeases: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const [{ count: availableUnits }, { count: newInquiries }, { count: pendingReservations }, { count: activeLeases }] =
    await Promise.all([
      supabase.from("units").select("id", { count: "exact", head: true }).eq("status", "AVAILABLE"),
      supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "NEW"),
      supabase
        .from("reservation_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "REQUESTED"),
      supabase.from("leases").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    ]);
  return {
    availableUnits: availableUnits ?? 0,
    newInquiries: newInquiries ?? 0,
    pendingReservations: pendingReservations ?? 0,
    activeLeases: activeLeases ?? 0,
  };
}

export interface AvailableUnitOption {
  id: string;
  publicLabel: string;
  unitTypeName: string;
  monthlyRent: number;
}

export async function getLegalConfigurationStatus(): Promise<{ ready: boolean; version: string | null; status: string | null }> {
  const { data } = await createServiceRoleClient()
    .from("legal_rule_sets")
    .select("version, verification_status, is_active")
    .eq("jurisdiction", "PH")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    ready: data?.verification_status === "VERIFIED" && data?.is_active === true,
    version: data?.version ?? null,
    status: data?.verification_status ?? null,
  };
}

export async function getAvailableUnitsForLease(): Promise<AvailableUnitOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id, public_label, monthly_rent, unit_types(name)")
    .eq("status", "AVAILABLE")
    .order("public_label");
  return (data ?? []).map((raw) => {
    const unit = raw as unknown as {
      id: string;
      public_label: string;
      monthly_rent: number;
      unit_types: { name: string } | { name: string }[] | null;
    };
    const unitType = Array.isArray(unit.unit_types) ? unit.unit_types[0] : unit.unit_types;
    return {
      id: unit.id,
      publicLabel: unit.public_label,
      unitTypeName: unitType?.name ?? "Unit",
      monthlyRent: Number(unit.monthly_rent),
    };
  });
}

export interface LeaseRow {
  id: string;
  unitId: string;
  publicLabel: string;
  tenantName: string | null;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
}

export async function getActiveLeases(): Promise<LeaseRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leases")
    .select("id, status, start_date, end_date, monthly_rent, unit_id, tenant_id")
    .eq("status", "ACTIVE")
    .order("start_date", { ascending: false });
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    unit_id: string;
    tenant_id: string | null;
  }>;
  if (!rows.length) return [];
  const unitIds = rows.map((r) => r.unit_id);
  const tenantIds = rows.map((r) => r.tenant_id).filter(Boolean) as string[];
  const [{ data: units }, { data: tenants }] = await Promise.all([
    supabase.from("units").select("id, public_label").in("id", unitIds),
    supabase.from("tenants").select("id, client_id").in("id", tenantIds.length ? tenantIds : ([] as string[])),
  ]);
  const unitMap = new Map((units ?? []).map((u: { id: string; public_label: string }) => [u.id, u.public_label]));
  const clientIds = (tenants ?? []).map((t: { id: string; client_id: string | null }) => t.client_id).filter(Boolean) as string[];
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .in("id", clientIds.length ? clientIds : ([] as string[]));
  const tenantClientMap = new Map(
    (tenants ?? []).map((t: { id: string; client_id: string | null }) => [t.id, t.client_id]),
  );
  const clientMap = new Map((clients ?? []).map((c: { id: string; full_name: string }) => [c.id, c.full_name]));
  return rows.map((r) => ({
    id: r.id,
    unitId: r.unit_id,
    publicLabel: unitMap.get(r.unit_id) ?? "—",
    tenantName:
      (r.tenant_id && clientMap.get(tenantClientMap.get(r.tenant_id) ?? "")) ?? null,
    status: r.status,
    startDate: r.start_date,
    endDate: r.end_date,
    monthlyRent: Number(r.monthly_rent),
  }));
}

export async function getMyActiveLease(): Promise<LeaseRow | null> {
  const { authenticate, AuthorizationError } = await import("@/lib/security/authenticate");
  const actor = await authenticate();
  if (!actor?.roles.includes("TENANT")) throw new AuthorizationError(403, "Tenant access only.");
  const supabase = await createClient();
  const { data: tenant } = await supabase.from("tenants").select("id").eq("profile_id", actor.userId).maybeSingle();
  if (!tenant) return null;
  const { data: lease } = await supabase
    .from("leases")
    .select("id, status, start_date, end_date, monthly_rent, unit_id, tenant_id")
    .eq("tenant_id", tenant.id)
    .eq("status", "ACTIVE")
    .order("start_date", { ascending: false })
    .maybeSingle();
  if (!lease) return null;
  // The public units policy intentionally hides occupied inventory. Resolve the
  // label server-side only after the authenticated tenant's lease is proven.
  const { data: unit } = await createServiceRoleClient().from("units").select("public_label").eq("id", lease.unit_id).maybeSingle();
  return {
    id: lease.id,
    unitId: lease.unit_id,
    publicLabel: unit?.public_label ?? "Unit",
    tenantName: null,
    status: lease.status,
    startDate: lease.start_date,
    endDate: lease.end_date,
    monthlyRent: Number(lease.monthly_rent),
  };
}

export interface InquiryRow {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  summary: string | null;
  createdAt: string;
  unitLabels: string[];
  statusVersion: number;
  nextAction: string | null;
  nextActionAt: string | null;
}

export async function getInquiries(limit = 50): Promise<InquiryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select("id, status, status_version, next_action, next_action_at, summary, created_at, client_id, inquiry_units(unit:units(public_label))")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    status: string;
    summary: string | null;
    created_at: string;
    client_id: string | null;
    status_version: number;
    next_action: string | null;
    next_action_at: string | null;
    inquiry_units: { unit: { public_label: string } | null }[];
  }>;
  const clientIds = rows.map((r) => r.client_id).filter(Boolean) as string[];
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, email, phone")
    .in("id", clientIds.length ? clientIds : ([] as string[]));
  const clientMap = new Map(
    (clients ?? []).map((c: { id: string; full_name: string; email: string; phone: string }) => [c.id, c]),
  );
  return rows.map((r) => {
    const client = r.client_id ? clientMap.get(r.client_id) : undefined;
    return {
      id: r.id,
      fullName: client?.full_name ?? null,
      email: client?.email ?? null,
      phone: client?.phone ?? null,
      status: r.status,
      summary: r.summary,
      createdAt: r.created_at,
      unitLabels: (r.inquiry_units ?? [])
        .map((iu) => iu.unit?.public_label)
        .filter(Boolean) as string[],
      statusVersion: r.status_version,
      nextAction: r.next_action,
      nextActionAt: r.next_action_at,
    };
  });
}

export interface ClientRow { id: string; fullName: string; email: string | null; phone: string | null; source: string | null; createdAt: string; archivedAt: string | null; statusVersion: number; }
export async function getClients(limit = 200): Promise<ClientRow[]> {
  const { data, error } = await createServiceRoleClient().from("clients").select("id, full_name, email, phone, source, created_at, archived_at, status_version").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error("Could not load clients.");
  return (data ?? []).map((client: { id: string; full_name: string; email: string | null; phone: string | null; source: string | null; created_at: string; archived_at: string | null; status_version: number }) => ({ id: client.id, fullName: client.full_name, email: client.email, phone: client.phone, source: client.source, createdAt: client.created_at, archivedAt: client.archived_at, statusVersion: client.status_version }));
}

export interface TenantRow { id: string; tenantNumber: string; status: string; fullName: string | null; email: string | null; createdAt: string; statusVersion: number; }
export async function getTenants(limit = 200): Promise<TenantRow[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("tenants").select("id, tenant_number, status, status_version, client_id, created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error("Could not load tenants.");
  const rows = (data ?? []) as { id: string; tenant_number: string; status: string; status_version: number; client_id: string | null; created_at: string }[];
  const clientIds = rows.map((row) => row.client_id).filter(Boolean) as string[];
  const { data: clients } = await supabase.from("clients").select("id, full_name, email").in("id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);
  const clientMap = new Map((clients ?? []).map((client: { id: string; full_name: string; email: string | null }) => [client.id, client]));
  return rows.map((row) => { const client = row.client_id ? clientMap.get(row.client_id) : null; return { id: row.id, tenantNumber: row.tenant_number, status: row.status, fullName: client?.full_name ?? null, email: client?.email ?? null, createdAt: row.created_at, statusVersion: row.status_version }; });
}

export interface ReservationRequestRow { id: string; unitLabel: string; status: string; decisionReason: string | null; createdAt: string; prospectName: string | null; prospectEmail: string | null; statusVersion: number; }
export async function getReservationRequests(limit = 200): Promise<ReservationRequestRow[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("reservation_requests").select("id, inquiry_id, unit_id, status, status_version, decision_reason, created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error("Could not load reservation requests.");
  const rows = (data ?? []) as { id: string; inquiry_id: string; unit_id: string; status: string; status_version: number; decision_reason: string | null; created_at: string }[];
  const [{ data: units }, { data: inquiries }] = await Promise.all([
    supabase.from("units").select("id, public_label").in("id", rows.length ? rows.map((row) => row.unit_id) : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("inquiries").select("id, client_id").in("id", rows.length ? rows.map((row) => row.inquiry_id) : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  const labels = new Map((units ?? []).map((unit: { id: string; public_label: string }) => [unit.id, unit.public_label]));
  const inquiryClient = new Map((inquiries ?? []).map((item: { id: string; client_id: string }) => [item.id, item.client_id]));
  const clientIds = [...new Set([...inquiryClient.values()].filter(Boolean))];
  const { data: clients } = await supabase.from("clients").select("id, full_name, email").in("id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);
  const clientMap = new Map((clients ?? []).map((client: { id: string; full_name: string; email: string | null }) => [client.id, client]));
  return rows.map((row) => {
    const client = clientMap.get(inquiryClient.get(row.inquiry_id) ?? "");
    return { id: row.id, unitLabel: labels.get(row.unit_id) ?? "Unit", status: row.status, decisionReason: row.decision_reason, createdAt: row.created_at, prospectName: client?.full_name ?? null, prospectEmail: client?.email ?? null, statusVersion: row.status_version };
  });
}
