import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { type ApiContext, register } from "@/lib/api/router";
import { getMyBills, getMyPayments, submitPayment } from "@/features/billing/queries";

async function billsHandler() {
  try {
    return ok({ bills: await getMyBills() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

async function paymentsHandler() {
  try {
    return ok({ payments: await getMyPayments() });
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

const submitSchema = z.object({
  billId: z.string().uuid().nullable().optional(),
  amount: z.number().positive().max(100_000_000),
  method: z.enum(["BANK_TRANSFER", "GCASH", "PAYMAYA", "CARD", "OVER_THE_COUNTER", "OTHER"]),
  externalReference: z.string().max(200).optional(),
});

async function submitPaymentHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", "Invalid payment.", { issues: parsed.error.issues });
  try {
    const result = await submitPayment(parsed.data);
    return ok(result);
  } catch (e) {
    return fail("FORBIDDEN", (e as Error).message);
  }
}

export function registerBillingRoutes(): void {
  register("GET", "billing/me/bills", billsHandler);
  register("GET", "billing/me/payments", paymentsHandler);
  register("POST", "billing/me/payments", submitPaymentHandler);
}
