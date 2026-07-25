import "server-only";
import { authenticate, type Actor } from "@/lib/security/authenticate";
import { AuthorizationError } from "@/lib/security/authenticate";
import { createServiceRoleClient } from "@/lib/supabase/service";

/** Resolve the tenant_id for the authenticated actor (via profile -> tenant). */
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
  billId?: string | null;
  amount: number;
  method: string;
  externalReference?: string;
}

export interface SubmitPaymentResult {
  paymentId: string;
  status: string;
}

export async function submitPayment(input: SubmitPaymentInput): Promise<SubmitPaymentResult> {
  const actor = await authenticate();
  const isTenant = !!actor && actor.roles.includes("TENANT");
  if (!isTenant) throw new AuthorizationError(403, "Tenant access only.");
  const tenantId = await resolveTenantId(actor!);
  const supabase = createServiceRoleClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      tenant_id: tenantId,
      bill_id: input.billId ?? null,
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
