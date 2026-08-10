import "server-only";
import { randomUUID } from "node:crypto";
import { authenticate } from "@/lib/security/authenticate";
import { AuthorizationError } from "@/lib/security/authenticate";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { evaluateLeaseCompliance } from "@/features/compliance/engine";

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
 * Create an ACTIVE lease for a unit and flip the unit to OCCUPIED. Uses the
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

    const { data: ruleSet } = await supabase
      .from("legal_rule_sets")
      .select("id, version, parameters, effective_from, effective_to")
      .eq("jurisdiction", "PH")
      .eq("verification_status", "VERIFIED")
      .eq("is_active", true)
      .lte("effective_from", input.startDate)
      .or(`effective_to.is.null,effective_to.gte.${input.startDate}`)
      .maybeSingle();

    const evaluation = ruleSet
      ? evaluateLeaseCompliance(
          { monthlyRent: input.monthlyRent, advanceAmount: input.advanceAmount, depositAmount: input.depositAmount },
          ruleSet.parameters as { max_advance_months?: number | null; max_deposit_months?: number | null },
        )
      : {
          outcome: "REVIEW_REQUIRED" as const,
          reasons: ["No verified effective legal rule set is active for this lease date."],
          trace: { startDate: input.startDate },
        };
    const { data: compliance, error: complianceError } = await supabase
      .from("compliance_results")
      .insert({
        input_snapshot: {
          monthly_rent: input.monthlyRent,
          advance_amount: input.advanceAmount,
          deposit_amount: input.depositAmount,
          start_date: input.startDate,
          end_date: input.endDate,
        },
        rule_set_id: ruleSet?.id ?? null,
        rule_version: ruleSet?.version ?? null,
        outcome: evaluation.outcome,
        calculation_trace: { ...evaluation.trace, reasons: evaluation.reasons },
        locked: true,
      })
      .select("id")
      .maybeSingle();
    if (complianceError || !compliance) return { ok: false, error: "Could not record the lease compliance evaluation." };
    if (evaluation.outcome !== "PASS") return { ok: false, error: evaluation.reasons.join(" ") };

    const { data: unit, error: unitErr } = await supabase
      .from("units")
      .select("id, status")
      .eq("id", input.unitId)
      .maybeSingle();
    if (unitErr || !unit) return { ok: false, error: "Unit not found." };
    if (unit.status !== "AVAILABLE") return { ok: false, error: "Unit is not available for leasing." };

  // Resolve the optional portal profile first so an admin-created lease is
  // immediately visible to the matching resident account.
  const { data: tenantProfile } = input.tenantEmail
    ? await supabase
        .from("profiles")
        .select("id")
        .eq("email", input.tenantEmail.toLowerCase())
        .maybeSingle()
    : { data: null };

  // Resolve (or create) the CRM client record for the tenant once.
  const client = input.tenantEmail ? await resolveClient(supabase, input) : null;

  // Create or reuse a tenant record.
  let tenantId: string;
  if (client) {
    const { data: existingByProfile } = tenantProfile
      ? await supabase
          .from("tenants")
          .select("id, client_id")
          .eq("profile_id", tenantProfile.id)
          .maybeSingle()
      : { data: null };
    const { data: existingByClient } = existingByProfile
      ? { data: null }
      : await supabase
          .from("tenants")
          .select("id, client_id")
          .eq("client_id", client.id)
          .maybeSingle();
    const existing = existingByProfile ?? existingByClient;
    if (existing) {
      tenantId = existing.id;
      if (!existing.client_id) {
        await supabase
          .from("tenants")
          .update({ client_id: client.id })
          .eq("id", existing.id);
      }
    } else {
      const { data: created, error } = await supabase
        .from("tenants")
        .insert({
          client_id: client.id,
          profile_id: tenantProfile?.id ?? null,
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
        profile_id: tenantProfile?.id ?? null,
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
      compliance_result_id: compliance.id,
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
  const normalizedEmail = input.tenantEmail.trim().toLowerCase();
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("clients")
      .update({ full_name: input.tenantName, phone: input.tenantPhone ?? null })
      .eq("id", existing.id);
    return existing;
  }
  const { data: client } = await supabase
    .from("clients")
    .insert({ full_name: input.tenantName, email: normalizedEmail, phone: input.tenantPhone ?? null, source: "STAFF" })
    .select("id")
    .maybeSingle();
  if (!client) throw new Error("Could not create client for tenant.");
  return { id: client.id };
}
