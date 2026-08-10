import "server-only";
import { authenticate, type Actor } from "@/lib/security/authenticate";
import { AuthorizationError } from "@/lib/security/authenticate";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { randomUUID } from "node:crypto";

/** Resolve the tenant_id for the authenticated actor (via profile -> tenant). */
async function resolveTenantId(actor: Actor): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", actor.userId)
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

export interface BillView {
  id: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  items: { description: string; amount: number }[];
}

export async function getMyBills(): Promise<BillView[]> {
  const actor = await authenticate();
  const isTenant = !!actor && actor.roles.includes("TENANT");
  if (!isTenant) throw new AuthorizationError(403, "Tenant access only.");
  const tenantId = await resolveTenantId(actor!);
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("bills")
    .select("id, period_start, period_end, due_date, total_amount, paid_amount, balance, accounting_status, bill_items(description, amount)")
    .eq("tenant_id", tenantId)
    .order("period_start", { ascending: false });
  return (data ?? []).map((b: { id: string; period_start: string; period_end: string; due_date: string | null; total_amount: number; paid_amount: number; balance: number; accounting_status: string; bill_items: { description: string | null; amount: number }[] | null }) => ({
    id: b.id,
    periodStart: b.period_start,
    periodEnd: b.period_end,
    dueDate: b.due_date,
    totalAmount: Number(b.total_amount),
    paidAmount: Number(b.paid_amount),
    balance: Number(b.balance),
    status: b.accounting_status,
    items: (b.bill_items ?? []).map((i) => ({ description: i.description ?? "", amount: Number(i.amount) })),
  }));
}

export interface PaymentView {
  id: string;
  billId?: string | null;
  submittedAmount: number;
  method: string;
  status: string;
  submittedAt: string;
}

export async function getMyPayments(): Promise<PaymentView[]> {
  const actor = await authenticate();
  const isTenant = !!actor && actor.roles.includes("TENANT");
  if (!isTenant) throw new AuthorizationError(403, "Tenant access only.");
  const tenantId = await resolveTenantId(actor!);
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("payments")
    .select("id, bill_id, submitted_amount, method, status, submitted_at")
    .eq("tenant_id", tenantId)
    .order("submitted_at", { ascending: false });
  return (data ?? []).map((p: { id: string; bill_id: string | null; submitted_amount: number; method: string; status: string; submitted_at: string }) => ({
    id: p.id,
    billId: p.bill_id,
    submittedAmount: Number(p.submitted_amount),
    method: p.method,
    status: p.status,
    submittedAt: p.submitted_at,
  }));
}

export interface SubmitPaymentInput {
  billId: string;
  amount: number;
  method: string;
  externalReference?: string;
}

export interface SubmitPaymentResult {
  paymentId: string;
  status: string;
}

export async function getAllPayments(): Promise<PaymentView[]> {
  const actor = await authenticate();
  if (!actor?.roles.some((role) => role === "SUPER_ADMIN" || role === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const { data, error } = await createServiceRoleClient()
    .from("payments")
    .select("id, bill_id, submitted_amount, method, status, submitted_at")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error("Could not load payments.");
  return (data ?? []).map((payment: { id: string; bill_id: string | null; submitted_amount: number; method: string; status: string; submitted_at: string }) => ({
    id: payment.id,
    billId: payment.bill_id,
    submittedAmount: Number(payment.submitted_amount),
    method: payment.method,
    status: payment.status,
    submittedAt: payment.submitted_at,
  }));
}

export interface VerifyPaymentInput {
  paymentId: string;
  decision: "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED";
  approvedAmount?: number;
  reason?: string;
}

export interface VerifyPaymentResult {
  paymentId: string;
  status: string;
  approvedAmount: number | null;
  billId: string;
}

export interface AdminBillView extends BillView {
  tenantId: string;
  leaseId: string;
}

export interface GenerateBillInput {
  leaseId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
}

export async function generateMonthlyBill(input: GenerateBillInput): Promise<{ billId: string; totalAmount: number }> {
  const actor = await authenticate();
  if (!actor?.roles.some((role) => role === "SUPER_ADMIN" || role === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const periodStart = new Date(`${input.periodStart}T00:00:00Z`);
  const periodEnd = new Date(`${input.periodEnd}T00:00:00Z`);
  const dueDate = new Date(`${input.dueDate}T00:00:00Z`);
  if (periodEnd < periodStart) throw new Error("Billing period end must not precede its start.");
  const latestStatutoryDue = new Date(periodStart);
  latestStatutoryDue.setUTCDate(latestStatutoryDue.getUTCDate() + 4);
  if (dueDate < periodStart || dueDate > latestStatutoryDue) {
    throw new Error("The due date must fall within the first five days of the billing period.");
  }

  const supabase = createServiceRoleClient();
  const { data: lease } = await supabase
    .from("leases")
    .select("id, tenant_id, unit_id, start_date, end_date, monthly_rent, status")
    .eq("id", input.leaseId)
    .maybeSingle();
  if (!lease || lease.status !== "ACTIVE") throw new Error("Select an active lease.");
  if (input.periodStart < lease.start_date || input.periodEnd > lease.end_date) {
    throw new Error("The billing period must be inside the lease term.");
  }
  const { data: unit } = await supabase
    .from("units")
    .select("monthly_dues")
    .eq("id", lease.unit_id)
    .maybeSingle();
  if (!unit) throw new Error("The leased unit could not be loaded.");

  const rent = Number(lease.monthly_rent);
  const dues = Number(unit.monthly_dues ?? 0);
  const totalAmount = rent + dues;
  const billId = randomUUID();
  const { error } = await supabase.from("bills").insert({
    id: billId,
    tenant_id: lease.tenant_id,
    lease_id: lease.id,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: input.dueDate,
    accounting_status: "ISSUED",
    display_status: "Due",
    total_debit: totalAmount,
    total_credit: 0,
    total_amount: totalAmount,
    paid_amount: 0,
    balance: totalAmount,
  });
  if (error) {
    if (error.code === "23505") throw new Error("A bill already exists for this lease and period.");
    throw new Error("The bill could not be created.");
  }
  const items = [
    { bill_id: billId, item_code: "RENT", description: "Monthly rent", quantity: 1, rate: rent, amount: rent, effect: "DEBIT", line_order: 1 },
    ...(dues > 0 ? [{ bill_id: billId, item_code: "DUES", description: "Association dues", quantity: 1, rate: dues, amount: dues, effect: "DEBIT", line_order: 2 }] : []),
  ];
  const { error: itemsError } = await supabase.from("bill_items").insert(items);
  if (itemsError) {
    await supabase.from("bills").delete().eq("id", billId);
    throw new Error("The bill items could not be created.");
  }
  return { billId, totalAmount };
}

export async function getAllBills(): Promise<AdminBillView[]> {
  const actor = await authenticate();
  if (!actor?.roles.some((role) => role === "SUPER_ADMIN" || role === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id, tenant_id, lease_id, period_start, period_end, due_date, total_amount, paid_amount, balance, accounting_status, bill_items(description, amount)")
    .order("period_start", { ascending: false });
  if (error) throw new Error("Could not load bills.");
  return (data ?? []).map((b: {
    id: string; tenant_id: string; lease_id: string; period_start: string; period_end: string;
    due_date: string | null; total_amount: number; paid_amount: number; balance: number;
    accounting_status: string; bill_items: { description: string | null; amount: number }[] | null;
  }) => ({
    id: b.id,
    tenantId: b.tenant_id,
    leaseId: b.lease_id,
    periodStart: b.period_start,
    periodEnd: b.period_end,
    dueDate: b.due_date,
    totalAmount: Number(b.total_amount),
    paidAmount: Number(b.paid_amount),
    balance: Number(b.balance),
    status: b.accounting_status,
    items: (b.bill_items ?? []).map((item) => ({ description: item.description ?? "", amount: Number(item.amount) })),
  }));
}

/** Review and allocate a payment through the locked database transaction. */
export async function verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  const actor = await authenticate();
  if (!actor?.roles.some((role) => role === "SUPER_ADMIN" || role === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("verify_payment_transaction", {
    p_payment_id: input.paymentId,
    p_decision: input.decision,
    p_approved_amount: input.approvedAmount ?? null,
    p_reason: input.reason ?? null,
    p_actor_id: actor.userId,
  });
  if (error || !data) throw new Error("Could not verify payment.");
  const result = data as VerifyPaymentResult;
  return {
    paymentId: result.paymentId,
    status: result.status,
    approvedAmount: result.approvedAmount === null ? null : Number(result.approvedAmount),
    billId: result.billId,
  };
}

export async function submitPayment(input: SubmitPaymentInput): Promise<SubmitPaymentResult> {
  const actor = await authenticate();
  const isTenant = !!actor && actor.roles.includes("TENANT");
  if (!isTenant) throw new AuthorizationError(403, "Tenant access only.");
  const tenantId = await resolveTenantId(actor!);
  const supabase = createServiceRoleClient();
  const { data: bill } = await supabase
    .from("bills")
    .select("id, tenant_id, balance, accounting_status")
    .eq("id", input.billId)
    .maybeSingle();
  if (!bill || bill.tenant_id !== tenantId) {
    throw new AuthorizationError(403, "That bill does not belong to this tenant.");
  }
  if (!["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(bill.accounting_status) || Number(bill.balance) <= 0) {
    throw new Error("Payments can only be submitted for an open bill.");
  }
  if (input.amount > Number(bill.balance)) {
    throw new Error("Payment amount cannot exceed the open bill balance.");
  }

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      tenant_id: tenantId,
      bill_id: input.billId,
      submitted_amount: input.amount,
      method: input.method,
      external_reference: input.externalReference ?? null,
      status: "SUBMITTED",
    })
    .select("id, status")
    .maybeSingle();
  if (error || !payment) throw new Error("Could not record payment.");
  return { paymentId: payment.id, status: payment.status };
}
