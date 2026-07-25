import { createServiceRoleClient } from "@/lib/supabase/service";
import { authenticate } from "@/lib/security/authenticate";
import { AuthorizationError } from "@/lib/security/authenticate";
import { createHash, randomBytes } from "crypto";

export type GatePassStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
export type VerificationResult = "VALID" | "INVALID" | "EXPIRED" | "REVOKED" | "NOT_FOUND";

export interface GatePassView {
  id: string;
  unitId: string;
  tenantId: string;
  codeHash: string;
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
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generatePassCode(): string {
  const bytes = randomBytes(3);
  const num = parseInt(bytes.toString("hex"), 16) % 1000000;
  return String(num).padStart(6, "0");
}

async function resolveTenantId(): Promise<string> {
  const actor = await authenticate();
  const uid = actor?.userId;
  if (!uid) throw new AuthorizationError(401, "Not authenticated.");
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", uid)
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
    codeHash: p.code_hash,
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
    codeHash: p.code_hash,
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
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", profileIds);
  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));
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
    codeHash: p.code_hash,
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

export async function verifyGatePass(code: string, guardId: string): Promise<{ result: VerificationResult; pass?: GatePassView; denialReason?: string }> {
  const supabase = createServiceRoleClient();
  const pass = await getGatePassByCode(code);
  if (!pass) {
    await supabase.from("gate_pass_verifications").insert({
      gate_pass_id: null,
      guard_id: guardId,
      result: "NOT_FOUND",
    });
    return { result: "NOT_FOUND" };
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
  } else if (pass.status !== "ACTIVE") {
    result = "INVALID";
    denialReason = `Pass status: ${pass.status}.`;
  } else if (new Date(pass.validFrom) > now) {
    result = "INVALID";
    denialReason = "Pass is not yet valid.";
  } else if (pass.useCount >= pass.maxUses) {
    result = "INVALID";
    denialReason = `Pass usage limit reached (${pass.useCount}/${pass.maxUses}).`;
  } else {
    result = "VALID";
    await supabase
      .from("gate_passes")
      .update({ use_count: pass.useCount + 1, status: pass.useCount + 1 >= pass.maxUses ? "USED" : "ACTIVE" })
      .eq("id", pass.id);
  }
  await supabase.from("gate_pass_verifications").insert({
    gate_pass_id: pass.id,
    guard_id: guardId,
    result,
    denial_reason: denialReason,
  });
  return { result, pass, denialReason: denialReason ?? undefined };
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
  return ((data ?? []) as unknown as Array<{
    id: string; gate_pass_id: string | null; guard_id: string;
    result: VerificationResult; denial_reason: string | null; verified_at: string;
  }>).map((r: { id: string; gate_pass_id: string | null; guard_id: string; result: VerificationResult; denial_reason: string | null; verified_at: string }) => ({
    id: r.id,
    gatePassId: r.gate_pass_id,
    guardId: r.guard_id,
    result: r.result,
    denialReason: r.denial_reason,
    verifiedAt: r.verified_at,
  }));
}
