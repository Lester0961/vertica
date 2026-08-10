import "server-only";

import { randomUUID } from "node:crypto";
import { authenticate, AuthorizationError } from "@/lib/security/authenticate";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { evaluateLeaseCompliance, evaluateRentIncrease, type RentControlParameters } from "@/features/compliance/engine";

async function requireAdmin() {
  const actor = await authenticate();
  if (!actor || !actor.roles.some((role) => role === "SUPER_ADMIN" || role === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Property admin access only.");
  }
  return actor;
}

export async function updateClientRecord(id: string, input: { fullName: string; email?: string | null; phone?: string | null; archived?: boolean }) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: current } = await supabase.from("clients").select("id, status_version").eq("id", id).maybeSingle();
  if (!current) throw new Error("Client not found.");
  const { data, error } = await supabase
    .from("clients")
    .update({
      full_name: input.fullName.trim(),
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      archived_at: input.archived ? new Date().toISOString() : null,
      status_version: current.status_version + 1,
    })
    .eq("id", id)
    .eq("status_version", current.status_version)
    .select("id, full_name, email, phone, source, created_at, archived_at, status_version")
    .maybeSingle();
  if (error || !data) throw new Error("Client changed elsewhere. Refresh and try again.");
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    source: data.source,
    createdAt: data.created_at,
    archivedAt: data.archived_at,
    statusVersion: data.status_version,
  };
}

export async function updateInquiryRecord(id: string, input: { status: "NEW" | "CONTACTED" | "FOLLOW_UP" | "QUALIFIED" | "CONVERTED" | "CLOSED_LOST"; reason: string; nextAction?: string | null; nextActionAt?: string | null }) {
  const actor = await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: current } = await supabase.from("inquiries").select("id, status, status_version").eq("id", id).maybeSingle();
  if (!current) throw new Error("Inquiry not found.");
  const { data, error } = await supabase
    .from("inquiries")
    .update({
      status: input.status,
      next_action: input.nextAction?.trim() || null,
      next_action_at: input.nextActionAt || null,
      status_version: current.status_version + 1,
    })
    .eq("id", id)
    .eq("status_version", current.status_version)
    .select("id, status, status_version")
    .maybeSingle();
  if (error || !data) throw new Error("Inquiry changed elsewhere. Refresh and try again.");
  await supabase.from("inquiry_status_history").insert({
    inquiry_id: id,
    previous_status: current.status,
    next_status: input.status,
    reason: input.reason.trim(),
    actor_id: actor.userId,
  });
  return { id: data.id, status: data.status, statusVersion: data.status_version };
}

export async function decideReservationRequest(id: string, input: { decision: "APPROVED" | "REJECTED" | "CANCELLED"; reason: string }) {
  const actor = await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: request } = await supabase
    .from("reservation_requests")
    .select("id, inquiry_id, unit_id, status, status_version")
    .eq("id", id)
    .maybeSingle();
  if (!request) throw new Error("Reservation request not found.");
  if (request.status !== "REQUESTED") throw new Error("This request has already been decided.");

  if (input.decision === "APPROVED") {
    const { data: held } = await supabase
      .from("units")
      .update({ status: "RESERVED" })
      .eq("id", request.unit_id)
      .eq("status", "AVAILABLE")
      .select("id")
      .maybeSingle();
    if (!held) throw new Error("The unit is no longer available.");
    const holdExpires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { error: reservationError } = await supabase.from("reservations").insert({
      unit_id: request.unit_id,
      inquiry_id: request.inquiry_id,
      request_id: request.id,
      created_by: actor.userId,
      hold_expires: holdExpires,
      status: "ACTIVE",
    });
    if (reservationError) {
      await supabase.from("units").update({ status: "AVAILABLE" }).eq("id", request.unit_id).eq("status", "RESERVED");
      throw new Error("The reservation hold could not be created.");
    }
  }

  const { data: updated, error } = await supabase
    .from("reservation_requests")
    .update({
      status: input.decision,
      decision_reason: input.reason.trim(),
      decision_by: actor.userId,
      decision_at: new Date().toISOString(),
      status_version: request.status_version + 1,
    })
    .eq("id", id)
    .eq("status_version", request.status_version)
    .select("id, status, decision_reason")
    .maybeSingle();
  if (error || !updated) throw new Error("Reservation request changed elsewhere. Refresh and try again.");
  await supabase.from("reservation_request_history").insert({
    request_id: id,
    previous_status: request.status,
    next_status: input.decision,
    reason: input.reason.trim(),
    actor_id: actor.userId,
  });
  return { id: updated.id, status: updated.status, decisionReason: updated.decision_reason };
}

export async function updateTenantRecord(id: string, input: { status: "PENDING" | "ACTIVE" | "INACTIVE" }) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: current } = await supabase.from("tenants").select("id, status_version").eq("id", id).maybeSingle();
  if (!current) throw new Error("Tenant not found.");
  const { data, error } = await supabase
    .from("tenants")
    .update({ status: input.status, status_version: current.status_version + 1 })
    .eq("id", id)
    .eq("status_version", current.status_version)
    .select("id, status")
    .maybeSingle();
  if (error || !data) throw new Error("Tenant changed elsewhere. Refresh and try again.");
  return data;
}

export async function terminateLease(id: string, reason: string) {
  const actor = await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: lease } = await supabase.from("leases").select("id, unit_id, status, status_version").eq("id", id).maybeSingle();
  if (!lease || lease.status !== "ACTIVE") throw new Error("Only an active lease can be terminated.");
  const { data: updated } = await supabase
    .from("leases")
    .update({ status: "TERMINATED", status_version: lease.status_version + 1 })
    .eq("id", id)
    .eq("status_version", lease.status_version)
    .select("id")
    .maybeSingle();
  if (!updated) throw new Error("Lease changed elsewhere. Refresh and try again.");
  await Promise.all([
    supabase.from("lease_status_history").insert({ lease_id: id, previous_status: "ACTIVE", next_status: "TERMINATED", reason: reason.trim(), actor_id: actor.userId }),
    supabase.from("units").update({ status: "AVAILABLE" }).eq("id", lease.unit_id).eq("status", "OCCUPIED"),
  ]);
  return { id, status: "TERMINATED" as const };
}

export async function renewLease(id: string, input: { startDate: string; endDate: string; monthlyRent: number; advanceAmount: number; depositAmount: number }) {
  const actor = await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: lease } = await supabase
    .from("leases")
    .select("id, unit_id, tenant_id, end_date, monthly_rent, status, status_version")
    .eq("id", id)
    .maybeSingle();
  if (!lease || lease.status !== "ACTIVE") throw new Error("Only an active lease can be renewed.");
  if (input.startDate <= lease.end_date) throw new Error("Renewal must start after the current lease ends.");
  if (input.endDate <= input.startDate) throw new Error("Renewal end date must be after its start date.");

  const { data: ruleSet } = await supabase
    .from("legal_rule_sets")
    .select("id, version, parameters")
    .eq("jurisdiction", "PH")
    .eq("is_active", true)
    .maybeSingle();
  if (!ruleSet) throw new Error("Demo policy configuration is unavailable.");
  const parameters = ruleSet.parameters as RentControlParameters;
  const rentEvaluation = evaluateRentIncrease({
    previousMonthlyRent: Number(lease.monthly_rent),
    proposedMonthlyRent: input.monthlyRent,
    effectiveDate: input.startDate,
    sameTenant: true,
  }, parameters);
  const depositEvaluation = evaluateLeaseCompliance({
    monthlyRent: input.monthlyRent,
    advanceAmount: input.advanceAmount,
    depositAmount: input.depositAmount,
  }, parameters);
  if (rentEvaluation.outcome !== "PASS" || depositEvaluation.outcome !== "PASS") {
    throw new Error([...rentEvaluation.reasons, ...depositEvaluation.reasons].join(" "));
  }

  const { data: compliance } = await supabase.from("compliance_results").insert({
    input_snapshot: { lease_id: id, ...input },
    rule_set_id: ruleSet.id,
    rule_version: ruleSet.version,
    outcome: "PASS",
    calculation_trace: { rent: rentEvaluation.trace, advanceDeposit: depositEvaluation.trace, demoOnly: true },
    locked: true,
  }).select("id").maybeSingle();
  if (!compliance) throw new Error("Could not record the demo policy evaluation.");

  const newLeaseId = randomUUID();
  const { data: closed } = await supabase
    .from("leases")
    .update({ status: "RENEWED", status_version: lease.status_version + 1 })
    .eq("id", id)
    .eq("status_version", lease.status_version)
    .select("id")
    .maybeSingle();
  if (!closed) throw new Error("Lease changed elsewhere. Refresh and try again.");
  const { error: insertError } = await supabase.from("leases").insert({
    id: newLeaseId,
    unit_id: lease.unit_id,
    tenant_id: lease.tenant_id,
    start_date: input.startDate,
    end_date: input.endDate,
    monthly_rent: input.monthlyRent,
    advance_amount: input.advanceAmount,
    deposit_amount: input.depositAmount,
    renewal_parent_id: id,
    status: "ACTIVE",
    compliance_result_id: compliance.id,
  });
  if (insertError) {
    await supabase.from("leases").update({ status: "ACTIVE", status_version: lease.status_version + 2 }).eq("id", id).eq("status", "RENEWED");
    throw new Error("Renewal lease could not be created.");
  }
  await Promise.all([
    supabase.from("lease_status_history").insert({ lease_id: id, previous_status: "ACTIVE", next_status: "RENEWED", reason: `Renewed as ${newLeaseId}`, actor_id: actor.userId }),
    supabase.from("lease_status_history").insert({ lease_id: newLeaseId, next_status: "ACTIVE", reason: `Renewal of ${id}`, actor_id: actor.userId }),
  ]);
  return { leaseId: newLeaseId, status: "ACTIVE" as const };
}
