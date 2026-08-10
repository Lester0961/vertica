import { describe, expect, it } from "vitest";
import { evaluateLeaseCompliance, evaluateRentIncrease } from "@/features/compliance/engine";

describe("evaluateLeaseCompliance", () => {
  const parameters = { max_advance_months: 1, max_deposit_months: 2 };

  it("passes amounts within verified limits", () => {
    expect(evaluateLeaseCompliance({ monthlyRent: 20_000, advanceAmount: 20_000, depositAmount: 40_000 }, parameters).outcome).toBe("PASS");
  });

  it("fails amounts that exceed a configured cap", () => {
    const result = evaluateLeaseCompliance({ monthlyRent: 20_000, advanceAmount: 20_001, depositAmount: 40_000 }, parameters);
    expect(result.outcome).toBe("FAIL");
    expect(result.reasons).toContain("Advance exceeds the 1-month limit.");
  });

  it("fails closed when a legal limit is not usable", () => {
    expect(evaluateLeaseCompliance({ monthlyRent: 20_000, advanceAmount: 0, depositAmount: 0 }, { max_advance_months: null }).outcome).toBe("REVIEW_REQUIRED");
  });
});

describe("evaluateRentIncrease", () => {
  const parameters = {
    demo_only: true,
    rent_increase_rules: [
      { effective_from: "2025-01-01", effective_to: "2025-12-31", monthly_rent_ceiling: 10_000, max_annual_escalation_pct: 2.3, same_tenant_only: true },
      { effective_from: "2026-01-01", effective_to: "2026-12-31", monthly_rent_ceiling: 10_000, max_annual_escalation_pct: 1, same_tenant_only: true },
    ],
  };

  it("accepts the exact 2026 demo boundary", () => {
    const result = evaluateRentIncrease({ previousMonthlyRent: 10_000, proposedMonthlyRent: 10_100, effectiveDate: "2026-06-01", sameTenant: true }, parameters);
    expect(result.outcome).toBe("PASS");
  });

  it("rejects an amount above the 2026 demo boundary", () => {
    const result = evaluateRentIncrease({ previousMonthlyRent: 10_000, proposedMonthlyRent: 10_100.01, effectiveDate: "2026-06-01", sameTenant: true }, parameters);
    expect(result.outcome).toBe("FAIL");
  });

  it("does not apply the cap to a new tenancy or an amount above the configured ceiling", () => {
    expect(evaluateRentIncrease({ previousMonthlyRent: 9_000, proposedMonthlyRent: 12_000, effectiveDate: "2026-06-01", sameTenant: false }, parameters).outcome).toBe("PASS");
    expect(evaluateRentIncrease({ previousMonthlyRent: 16_000, proposedMonthlyRent: 18_000, effectiveDate: "2026-06-01", sameTenant: true }, parameters).outcome).toBe("PASS");
  });
});
