import { createClient } from "@/lib/supabase/server";

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

export async function getAvailableUnitsForLease(): Promise<AvailableUnitOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id, public_label, monthly_rent, unit_types(name)")
    .eq("status", "AVAILABLE")
    .order("public_label");
  return (data ?? []).map(
    (u: { id: string; public_label: string; monthly_rent: number; unit_types: { name: string }[] | null }) => ({
      id: u.id,
      publicLabel: u.public_label,
      unitTypeName: u.unit_types?.[0]?.name ?? "Unit",
      monthlyRent: Number(u.monthly_rent),
    }),
  );
}

export interface LeaseRow {
  id: string;
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
    publicLabel: unitMap.get(r.unit_id) ?? "—",
    tenantName:
      (r.tenant_id && clientMap.get(tenantClientMap.get(r.tenant_id) ?? "")) ?? null,
    status: r.status,
    startDate: r.start_date,
    endDate: r.end_date,
    monthlyRent: Number(r.monthly_rent),
  }));
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
}

export async function getInquiries(limit = 50): Promise<InquiryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select("id, status, summary, created_at, client_id, inquiry_units(unit:units(public_label))")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    status: string;
    summary: string | null;
    created_at: string;
    client_id: string | null;
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
    };
  });
}
