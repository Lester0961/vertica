"use server";

import { createLease, type CreateLeaseResult, type LeaseInput } from "@/features/staff/actions";

export async function createLeaseAction(formData: FormData): Promise<CreateLeaseResult> {
  const num = (k: string) => {
    const v = formData.get(k);
    if (v === null || v === "") return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };
  const input: LeaseInput = {
    unitId: String(formData.get("unitId") ?? ""),
    tenantName: String(formData.get("tenantName") ?? ""),
    tenantEmail: formData.get("tenantEmail") ? String(formData.get("tenantEmail")) : undefined,
    tenantPhone: formData.get("tenantPhone") ? String(formData.get("tenantPhone")) : undefined,
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    monthlyRent: num("monthlyRent"),
    advanceAmount: num("advanceAmount"),
    depositAmount: num("depositAmount"),
    documentPath: formData.get("documentPath") ? String(formData.get("documentPath")) : undefined,
  };
  if (!input.unitId || !input.tenantName || !input.startDate || !input.endDate) {
    return { ok: false, error: "Please complete all required fields." };
  }
  return createLease(input);
}
