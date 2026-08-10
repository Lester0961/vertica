export interface LeaseComplianceInput {
  monthlyRent: number;
  advanceAmount: number;
  depositAmount: number;
}

export interface RentControlParameters {
  max_advance_months?: number | null;
  max_deposit_months?: number | null;
  demo_only?: boolean;
  rent_increase_rules?: RentIncreaseRule[];
}

export interface RentIncreaseRule {
  effective_from: string;
  effective_to: string;
  monthly_rent_ceiling: number;
  max_annual_escalation_pct: number;
  same_tenant_only?: boolean;
}

export interface RentIncreaseInput {
  previousMonthlyRent: number;
  proposedMonthlyRent: number;
  effectiveDate: string;
  sameTenant: boolean;
  unitBecameVacant?: boolean;
}

export interface LeaseComplianceEvaluation {
  outcome: "PASS" | "FAIL" | "REVIEW_REQUIRED";
  reasons: string[];
  trace: Record<string, unknown>;
}

/**
 * Deterministic educational rule evaluation. Missing or invalid values fail
 * closed so presentation data cannot silently bypass the configured limits.
 */
export function evaluateLeaseCompliance(
  input: LeaseComplianceInput,
  parameters: RentControlParameters,
): LeaseComplianceEvaluation {
  const reasons: string[] = [];
  const limits = {
    advance: parameters.max_advance_months,
    deposit: parameters.max_deposit_months,
  };
  const validLimit = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;

  if (!Number.isFinite(input.monthlyRent) || input.monthlyRent <= 0) {
    return { outcome: "FAIL", reasons: ["Monthly rent must be positive."], trace: { input, limits } };
  }
  if (!Number.isFinite(input.advanceAmount) || input.advanceAmount < 0 || !Number.isFinite(input.depositAmount) || input.depositAmount < 0) {
    return { outcome: "FAIL", reasons: ["Advance and deposit amounts must be non-negative."], trace: { input, limits } };
  }
  if (!validLimit(limits.advance) || !validLimit(limits.deposit)) {
    return {
      outcome: "REVIEW_REQUIRED",
      reasons: ["Verified legal rule set is missing a usable advance or deposit limit."],
      trace: { input, limits },
    };
  }

  const maxAdvance = input.monthlyRent * limits.advance;
  const maxDeposit = input.monthlyRent * limits.deposit;
  if (input.advanceAmount > maxAdvance) reasons.push(`Advance exceeds the ${limits.advance}-month limit.`);
  if (input.depositAmount > maxDeposit) reasons.push(`Deposit exceeds the ${limits.deposit}-month limit.`);

  return {
    outcome: reasons.length ? "FAIL" : "PASS",
    reasons,
    trace: { input, limits, maxAdvance, maxDeposit },
  };
}

export function evaluateRentIncrease(
  input: RentIncreaseInput,
  parameters: RentControlParameters,
): LeaseComplianceEvaluation {
  const rules = parameters.rent_increase_rules ?? [];
  const numericValues = [input.previousMonthlyRent, input.proposedMonthlyRent];
  if (numericValues.some((value) => !Number.isFinite(value) || value <= 0)) {
    return { outcome: "FAIL", reasons: ["Rent amounts must be positive."], trace: { input } };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate)) {
    return { outcome: "FAIL", reasons: ["Use an ISO effective date."], trace: { input } };
  }
  if (input.unitBecameVacant || !input.sameTenant) {
    return {
      outcome: "PASS",
      reasons: ["Demo rent-increase cap is not applied to a new tenancy."],
      trace: { input, demoOnly: parameters.demo_only === true, appliedRule: null },
    };
  }

  const rule = rules.find((candidate) =>
    input.effectiveDate >= candidate.effective_from
    && input.effectiveDate <= candidate.effective_to
    && input.previousMonthlyRent <= candidate.monthly_rent_ceiling,
  );
  if (!rule) {
    return {
      outcome: "PASS",
      reasons: ["No configured demo cap applies to this rent and effective date."],
      trace: { input, demoOnly: parameters.demo_only === true, appliedRule: null },
    };
  }

  const maximum = Number((input.previousMonthlyRent * (1 + rule.max_annual_escalation_pct / 100)).toFixed(2));
  const passes = input.proposedMonthlyRent <= maximum;
  return {
    outcome: passes ? "PASS" : "FAIL",
    reasons: passes
      ? [`Proposed rent is within the ${rule.max_annual_escalation_pct}% demo cap.`]
      : [`Proposed rent exceeds the ${rule.max_annual_escalation_pct}% demo cap of PHP ${maximum.toFixed(2)}.`],
    trace: { input, demoOnly: parameters.demo_only === true, appliedRule: rule, maximum },
  };
}
