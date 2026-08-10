import { createServiceRoleClient } from "@/lib/supabase/service";
import { authenticate } from "@/lib/security/authenticate";
import { AuthorizationError } from "@/lib/security/authenticate";
import { createHash, randomInt } from "crypto";

export type GatePassStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
export type VerificationResult = "VALID" | "INVALID" | "EXPIRED" | "REVOKED" | "NOT_FOUND";

export interface GatePassView {
  id: string;
  unitId: string;
  tenantId: string;
  validFrom: string;
  validTo: string;
  status: GatePassStatus;
  revocationReason: string | null;
  maxUses: number;
  useCount: number;
  createdAt: string;
  unitLabel: string;
  visitors: { id: string; visitorName: string; vehiclePlate: string | null }[];
}

export interface CreateGatePassInput {
  unitId: string;
  validFrom: string;
  validTo: string;
  maxUses?: number;
  visitors: { visitorName: string; vehiclePlate?: string }[];
}

export interface VerificationLog {
  id: string;
  gatePassId: string | null;
  guardId: string;
  result: VerificationResult;
  denialReason: string | null;
  verifiedAt: string;
  eventType?: "ENTRY" | "EXIT" | null;
  unitLabel?: string | null;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generatePassCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function resolveTenantId(): Promise<string> {
  const actor = await authenticate();
  const uid = actor?.userId;
  if (!uid) throw new AuthorizationError(401, "Not authenticated.");
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", uid)
    .single();
  if (!profile) throw new AuthorizationError(403, "No profile.");
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("profile_id", profile.id)
    .single();
  if (!tenant) throw new AuthorizationError(403, "No tenant linkage.");
  return tenant.id;
}

export async function getMyGatePasses(): Promise<GatePassView[]> {
  const tenantId = await resolveTenantId();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("gate_passes")
    .select("id, unit_id, tenant_id, code_hash, valid_from, valid_to, status, revocation_reason, max_uses, use_count, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  const passes = (data ?? []) as unknown as Array<{
    id: string; unit_id: string; tenant_id: string; code_hash: string;
    valid_from: string; valid_to: string; status: GatePassStatus;
    revocation_reason: string | null; max_uses: number; use_count: number; created_at: string;
  }>;
  if (!passes.length) return [];
  const unitIds = [...new Set(passes.map((p) => p.unit_id))];
  const { data: units } = await supabase
    .from("units").select("id, public_label").in("id", unitIds);
  const unitMap = new Map((units ?? []).map((u: { id: string; public_label: string }) => [u.id, u.public_label]));
  const passIds = passes.map((p) => p.id);
  const { data: visitors } = await supabase
    .from("gate_pass_visitors")
    .select("id, gate_pass_id, visitor_name, vehicle_plate")
    .in("gate_pass_id", passIds);
  const visitorMap = new Map<string, { id: string; visitorName: string; vehiclePlate: string | null }[]>();
  for (const v of (visitors ?? []) as unknown as Array<{ id: string; gate_pass_id: string; visitor_name: string; vehicle_plate: string | null }>) {
    const arr = visitorMap.get(v.gate_pass_id) ?? [];
    arr.push({ id: v.id, visitorName: v.visitor_name, vehiclePlate: v.vehicle_plate });
    visitorMap.set(v.gate_pass_id, arr);
  }
  return passes.map((p) => ({
    id: p.id,
    unitId: p.unit_id,
    tenantId: p.tenant_id,
    validFrom: p.valid_from,
    validTo: p.valid_to,
    status: p.status,
    revocationReason: p.revocation_reason,
    maxUses: p.max_uses,
    useCount: p.use_count,
    createdAt: p.created_at,
    unitLabel: unitMap.get(p.unit_id) ?? "?",
    visitors: visitorMap.get(p.id) ?? [],
  }));
}

export async function getGatePassByCode(code: string): Promise<GatePassView | null> {
  const supabase = createServiceRoleClient();
  const codeHash = hashCode(code);
  const { data } = await supabase
    .from("gate_passes")
    .select("id, unit_id, tenant_id, code_hash, valid_from, valid_to, status, revocation_reason, max_uses, use_count, created_at")
    .eq("code_hash", codeHash)
    .single();
  if (!data) return null;
  const p = data as unknown as {
    id: string; unit_id: string; tenant_id: string; code_hash: string;
    valid_from: string; valid_to: string; status: GatePassStatus;
    revocation_reason: string | null; max_uses: number; use_count: number; created_at: string;
  };
  const { data: units } = await supabase
    .from("units").select("id, public_label").eq("id", p.unit_id).single();
  const { data: visitors } = await supabase
    .from("gate_pass_visitors")
    .select("id, visitor_name, vehicle_plate")
    .eq("gate_pass_id", p.id);
  return {
    id: p.id,
    unitId: p.unit_id,
    tenantId: p.tenant_id,
    validFrom: p.valid_from,
    validTo: p.valid_to,
    status: p.status,
    revocationReason: p.revocation_reason,
    maxUses: p.max_uses,
    useCount: p.use_count,
    createdAt: p.created_at,
    unitLabel: (units as { public_label: string } | null)?.public_label ?? "?",
    visitors: (visitors ?? []).map((v: { id: string; visitor_name: string; vehicle_plate: string | null }) => ({
      id: v.id,
      visitorName: v.visitor_name,
      vehiclePlate: v.vehicle_plate,
    })),
  };
}

export async function createGatePass(input: CreateGatePassInput): Promise<{ passId: string; code: string }> {
  const tenantId = await resolveTenantId();
  const supabase = createServiceRoleClient();
  const { data: activeLease } = await supabase
    .from("leases")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("unit_id", input.unitId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!activeLease) {
    throw new AuthorizationError(403, "Gate passes can only be issued for your active leased unit.");
  }
  const code = generatePassCode();
  const codeHash = hashCode(code);
  const { data: pass, error } = await supabase
    .from("gate_passes")
    .insert({
      unit_id: input.unitId,
      tenant_id: tenantId,
      code_hash: codeHash,
      valid_from: input.validFrom,
      valid_to: input.validTo,
      max_uses: input.maxUses ?? 1,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (error || !pass) throw new Error("Could not create gate pass.");
  if (input.visitors.length) {
    await supabase.from("gate_pass_visitors").insert(
      input.visitors.map((v) => ({
        gate_pass_id: pass.id,
        visitor_name: v.visitorName,
        vehicle_plate: v.vehiclePlate ?? null,
      })),
    );
  }
  return { passId: pass.id, code };
}

export async function revokeGatePass(passId: string): Promise<void> {
  const tenantId = await resolveTenantId();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("gate_passes")
    .update({ status: "REVOKED", revocation_reason: "Revoked by tenant" })
    .eq("id", passId)
    .eq("tenant_id", tenantId)
    .eq("status", "ACTIVE");
  if (error) throw new Error("Could not revoke gate pass.");
}

export async function revokeGatePassAsStaff(passId: string, reason: string): Promise<void> {
  const actor = await authenticate();
  if (!actor?.roles.some((role) => role === "SUPER_ADMIN" || role === "PROPERTY_ADMIN")) throw new AuthorizationError(403, "Admin access only.");
  const { data, error } = await createServiceRoleClient().from("gate_passes").update({ status: "REVOKED", revocation_reason: reason.trim() }).eq("id", passId).eq("status", "ACTIVE").select("id").maybeSingle();
  if (error || !data) throw new Error("Only an active gate pass can be revoked.");
}

export async function getAllGatePasses(): Promise<GatePassView[]> {
  const actor = await authenticate();
  const roles = actor?.roles ?? [];
  if (!roles.some((r: string) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN" || r === "GUARD")) {
    throw new AuthorizationError(403, "Staff access only.");
  }
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("gate_passes")
    .select("id, unit_id, tenant_id, code_hash, valid_from, valid_to, status, revocation_reason, max_uses, use_count, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const passes = (data ?? []) as unknown as Array<{
    id: string; unit_id: string; tenant_id: string; code_hash: string;
    valid_from: string; valid_to: string; status: GatePassStatus;
    revocation_reason: string | null; max_uses: number; use_count: number; created_at: string;
  }>;
  if (!passes.length) return [];
  const unitIds = [...new Set(passes.map((p) => p.unit_id))];
  const tenantIds = [...new Set(passes.map((p) => p.tenant_id))];
  const [{ data: units }, { data: tenants }, { data: allVisitors }] = await Promise.all([
    supabase.from("units").select("id, public_label").in("id", unitIds),
    supabase.from("tenants").select("id, profile_id").in("id", tenantIds),
    supabase.from("gate_pass_visitors").select("id, gate_pass_id, visitor_name, vehicle_plate").in("gate_pass_id", passes.map((p) => p.id)),
  ]);
  const unitMap = new Map((units ?? []).map((u: { id: string; public_label: string }) => [u.id, u.public_label]));
  const profileIds = (tenants ?? []).map((t: { id: string; profile_id: string | null }) => t.profile_id).filter(Boolean) as string[];
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", profileIds);
  const profileMap = new Map((profiles ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]));
  const tenantProfileMap = new Map((tenants ?? []).map((t: { id: string; profile_id: string | null }) => [t.id, t.profile_id]));
  const visitorMap = new Map<string, { id: string; visitorName: string; vehiclePlate: string | null }[]>();
  for (const v of (allVisitors ?? []) as unknown as Array<{ id: string; gate_pass_id: string; visitor_name: string; vehicle_plate: string | null }>) {
    const arr = visitorMap.get(v.gate_pass_id) ?? [];
    arr.push({ id: v.id, visitorName: v.visitor_name, vehiclePlate: v.vehicle_plate });
    visitorMap.set(v.gate_pass_id, arr);
  }
  return passes.map((p) => ({
    id: p.id,
    unitId: p.unit_id,
    tenantId: p.tenant_id,
    validFrom: p.valid_from,
    validTo: p.valid_to,
    status: p.status,
    revocationReason: p.revocation_reason,
    maxUses: p.max_uses,
    useCount: p.use_count,
    createdAt: p.created_at,
    unitLabel: unitMap.get(p.unit_id) ?? "?",
    visitors: visitorMap.get(p.id) ?? [],
  }));
}

export async function verifyGatePass(code: string, guardId: string, eventType: "ENTRY" | "EXIT"): Promise<{ result: VerificationResult; pass?: GatePassView; denialReason?: string; eventType: "ENTRY" | "EXIT" }> {
  const supabase = createServiceRoleClient();
  const pass = await getGatePassByCode(code);
  if (!pass) {
    await supabase.from("gate_pass_verifications").insert({
      gate_pass_id: null,
      guard_id: guardId,
      result: "NOT_FOUND",
    });
    return { result: "NOT_FOUND", eventType };
  }
  const now = new Date();
  let result: VerificationResult;
  let denialReason: string | null = null;
  if (pass.status === "REVOKED") {
    result = "REVOKED";
    denialReason = pass.revocationReason ?? "Pass has been revoked.";
  } else if (pass.status === "EXPIRED" || new Date(pass.validTo) < now) {
    result = "EXPIRED";
    denialReason = "Pass has expired.";
  } else if (eventType === "ENTRY" && pass.status !== "ACTIVE") {
    result = "INVALID";
    denialReason = `Pass status: ${pass.status}.`;
  } else if (new Date(pass.validFrom) > now) {
    result = "INVALID";
    denialReason = "Pass is not yet valid.";
  } else if (eventType === "ENTRY" && pass.useCount >= pass.maxUses) {
    result = "INVALID";
    denialReason = `Pass usage limit reached (${pass.useCount}/${pass.maxUses}).`;
  } else if (eventType === "EXIT") {
    const { data: latest } = await supabase.from("access_events").select("event_type").eq("gate_pass_id", pass.id).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
    if (!latest || latest.event_type !== "ENTRY") {
      result = "INVALID";
      denialReason = "No unmatched entry was found for this pass.";
    } else {
      result = "VALID";
    }
  } else {
    const nextUseCount = pass.useCount + 1;
    const { data: consumed, error } = await supabase
      .from("gate_passes")
      .update({ use_count: nextUseCount, status: nextUseCount >= pass.maxUses ? "USED" : "ACTIVE" })
      .eq("id", pass.id)
      .eq("status", "ACTIVE")
      .eq("use_count", pass.useCount)
      .select("id")
      .maybeSingle();
    if (error || !consumed) {
      result = "INVALID";
      denialReason = "Pass state changed during verification. Please try again.";
    } else {
      result = "VALID";
      pass.useCount = nextUseCount;
      pass.status = nextUseCount >= pass.maxUses ? "USED" : "ACTIVE";
    }
  }
  const { data: verification } = await supabase.from("gate_pass_verifications").insert({
    gate_pass_id: pass.id,
    guard_id: guardId,
    result,
    denial_reason: denialReason,
  }).select("id").maybeSingle();
  if (result === "VALID") {
    await supabase.from("access_events").insert({ gate_pass_id: pass.id, verification_id: verification?.id ?? null, unit_id: pass.unitId, guard_id: guardId, event_type: eventType, visitor_name: pass.visitors[0]?.visitorName ?? null, vehicle_plate: pass.visitors[0]?.vehiclePlate ?? null });
  }
  return { result, pass, denialReason: denialReason ?? undefined, eventType };
}

export async function getRecentVerifications(): Promise<VerificationLog[]> {
  const actor = await authenticate();
  const roles = actor?.roles ?? [];
  if (!roles.some((r: string) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN" || r === "GUARD")) {
    throw new AuthorizationError(403, "Staff access only.");
  }
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("gate_pass_verifications")
    .select("id, gate_pass_id, guard_id, result, denial_reason, verified_at")
    .order("verified_at", { ascending: false })
    .limit(100);
  const verificationRows = (data ?? []) as unknown as Array<{
    id: string; gate_pass_id: string | null; guard_id: string;
    result: VerificationResult; denial_reason: string | null; verified_at: string;
  }>;
  if (!verificationRows.length) return [];
  const { data: events } = await supabase.from("access_events").select("verification_id, event_type, unit_id").in("verification_id", verificationRows.map((row) => row.id));
  const unitIds = [...new Set((events ?? []).map((event: { unit_id: string }) => event.unit_id))];
  const { data: units } = unitIds.length ? await supabase.from("units").select("id, public_label").in("id", unitIds) : { data: [] };
  const unitMap = new Map((units ?? []).map((unit: { id: string; public_label: string }) => [unit.id, unit.public_label]));
  const eventMap = new Map((events ?? []).map((event: { verification_id: string; event_type: "ENTRY" | "EXIT"; unit_id: string }) => [event.verification_id, event]));
  return verificationRows.map((r) => ({
    id: r.id,
    gatePassId: r.gate_pass_id,
    guardId: r.guard_id,
    result: r.result,
    denialReason: r.denial_reason,
    verifiedAt: r.verified_at,
    eventType: eventMap.get(r.id)?.event_type ?? null,
    unitLabel: unitMap.get(eventMap.get(r.id)?.unit_id ?? "") ?? null,
  }));
}
