import { describe, expect, it } from "vitest";
import { diversifyCandidates, rankCandidates, scoreUnits, type RecommendationUnit } from "./engine";

function unit(overrides: Partial<RecommendationUnit> = {}): RecommendationUnit {
  return {
    id: crypto.randomUUID(),
    publicLabel: "TEST-01",
    unitTypeCode: "STUDIO",
    unitTypeName: "Studio",
    bedrooms: 0,
    bathrooms: 1,
    floorNumber: 2,
    floorLabel: "Floor 2",
    areaSqm: 24,
    monthlyRent: 18_000,
    monthlyDues: 1_500,
    capacity: 2,
    furnishing: "SEMI_FURNISHED",
    availableFrom: "2026-08-01",
    features: { pets_allowed: true, accessible: true, quietness: 4, elevator_distance: 8 },
    ...overrides,
  };
}

describe("recommendation engine", () => {
  it("fails hard requirements before scoring", () => {
    const candidate = scoreUnits([unit()], {
      budgetMax: 17_999,
      householdSize: 3,
      preferredBedrooms: 1,
      minArea: 25,
      furnishing: "FULLY_FURNISHED",
      pets: true,
      accessibilityRequired: true,
      priorities: ["low_rent"],
    })[0]!;

    expect(candidate.hardFail).toBe(true);
    expect(candidate.score).toBe(0);
    expect(candidate.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining("Over budget"),
      expect.stringContaining("Capacity"),
      expect.stringContaining("Bedrooms"),
      expect.stringContaining("Area"),
      "Does not match the required furnishing level",
    ]));
  });

  it("treats Studio as an exact zero-bedroom requirement", () => {
    const candidates = scoreUnits([
      unit({ id: "studio", bedrooms: 0 }),
      unit({ id: "one", bedrooms: 1, unitTypeCode: "1BR" }),
    ], { budgetMax: 50_000, householdSize: 1, preferredBedrooms: 0, priorities: ["low_rent"] });

    expect(candidates.find((item) => item.unit.id === "studio")?.hardFail).toBe(false);
    expect(candidates.find((item) => item.unit.id === "one")?.hardFail).toBe(true);
  });

  it("scores a higher floor above a lower floor when high floor is ranked", () => {
    const ranked = rankCandidates(scoreUnits([
      unit({ id: "low", floorNumber: 2 }),
      unit({ id: "high", floorNumber: 9 }),
    ], { budgetMax: 50_000, householdSize: 1, priorities: ["high_floor"] }));

    expect(ranked[0]!.unit.id).toBe("high");
  });

  it("diversifies the top three by unit type before filling duplicates", () => {
    const candidates = rankCandidates(scoreUnits([
      unit({ id: "s1", unitTypeCode: "STUDIO", monthlyRent: 16_000 }),
      unit({ id: "s2", unitTypeCode: "STUDIO", monthlyRent: 16_500 }),
      unit({ id: "b1", unitTypeCode: "1BR", bedrooms: 1, monthlyRent: 20_000 }),
      unit({ id: "b2", unitTypeCode: "2BR", bedrooms: 2, monthlyRent: 28_000 }),
    ], { budgetMax: 50_000, householdSize: 1, priorities: ["low_rent"] }));

    expect(diversifyCandidates(candidates, 3).map((item) => item.unit.unitTypeCode)).toEqual(["STUDIO", "1BR", "2BR"]);
  });
});
