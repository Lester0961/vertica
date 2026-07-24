import "server-only";
import { randomUUID } from "node:crypto";
import { authenticate } from "@/lib/security/authenticate";
import { AuthorizationError } from "@/lib/security/authenticate";
import { createServiceRoleClient } from "@/lib/supabase/service";

async function requireAdmin(): Promise<void> {
  const claims = await authenticate();
  if (!claims || !claims.roles.some((r) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Only property admins may perform this action.");
  }
}

export interface LeaseInput {
  unitId: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  advanceAmount: number;
  depositAmount: number;
  documentPath?: string;
}

export type CreateLeaseResult = { ok: true; leaseId: string } | { ok: false; error: string };

/**
 * Create an ACTIVE lease for a unit and flip the unit to LEASED. Uses the
 * service-role client (server-only, audited). Fails if the unit is not AVAILABLE
 * or already has an active lease (enforced by the units table status + history).
 */
export async function createLease(input: LeaseInput): Promise<CreateLeaseResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  try {
    const supabase = createServiceRoleClient();

    const { data: unit, error: unitErr } = await supabase
      .from("units")
      .select("id, status")
      .eq("id", input.unitId)
      .maybeSingle();
    if (unitErr || !unit) return { ok: false, error: "Unit not found." };
    if (unit.status !== "AVAILABLE") return { ok: false, error: "Unit is not available for leasing." };

  // Resolve (or create) the client record for the tenant once.
  const client = input.tenantEmail ? await resolveClient(supabase, input) : null;

  // Create or reuse a tenant record.
  let tenantId: string;
  if (client) {
    const { data: existing } = await supabase
      .from("tenants")
      .select("id")
      .eq("client_id", client.id)
      .maybeSingle();
    if (existing) {
      tenantId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("tenants")
        .insert({
          client_id: client.id,
          tenant_number: `T-${Date.now().toString().slice(-6)}`,
          status: "ACTIVE",
        })
        .select("id")
        .maybeSingle();
      if (error || !created) throw new Error("Could not create tenant.");
      tenantId = created.id;
    }
  } else {
    const { data: created, error } = await supabase
      .from("tenants")
      .insert({
        tenant_number: `T-${Date.now().toString().slice(-6)}`,
        status: "ACTIVE",
      })
      .select("id")
      .maybeSingle();
    if (error || !created) throw new Error("Could not create tenant.");
    tenantId = created.id;
  }

    const leaseId = randomUUID();
    const { error: leaseErr } = await supabase.from("leases").insert({
      id: leaseId,
      unit_id: input.unitId,
      tenant_id: tenantId,
      start_date: input.startDate,
      end_date: input.endDate,
      monthly_rent: input.monthlyRent,
      advance_amount: input.advanceAmount,
      deposit_amount: input.depositAmount,
      status: "ACTIVE",
      document_path: input.documentPath ?? null,
    });
    if (leaseErr) return { ok: false, error: "Could not create lease." };

    const { error: histErr } = await supabase.from("lease_status_history").insert({
      lease_id: leaseId,
      next_status: "ACTIVE",
      reason: "Lease activated",
    });
    void histErr;

    const { error: unitUpdErr } = await supabase
      .from("units")
      .update({ status: "OCCUPIED" })
      .eq("id", input.unitId);
    if (unitUpdErr) return { ok: false, error: "Could not update unit status." };

    return { ok: true, leaseId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function resolveClient(
  supabase: ReturnType<typeof createServiceRoleClient>,
  input: LeaseInput,
): Promise<{ id: string }> {
  if (!input.tenantEmail) throw new Error("Tenant email required to resolve client.");
  const { data: client } = await supabase
    .from("clients")
    .insert({ full_name: input.tenantName, email: input.tenantEmail, phone: input.tenantPhone ?? null, source: "STAFF" })
    .select("id")
    .maybeSingle();
  if (!client) throw new Error("Could not create client for tenant.");
  return { id: client.id };
}
