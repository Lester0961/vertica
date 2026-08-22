import { describe, expect, it } from "vitest";
import {
  computeBuildingPlan,
  defaultView,
  explodedView,
  sortUnitsForKeyboard,
  unitMatchesFilters,
  type BuildingUnit3D,
} from "@/components/units/three/buildingLayout";

const unit = (overrides: Partial<BuildingUnit3D>): BuildingUnit3D => ({
  id: "unit-202",
  publicLabel: "Unit 202",
  unitNumber: "202",
  unitTypeCode: "STUDIO",
  unitTypeName: "Studio",
  floorNumber: 2,
  monthlyRent: 16_000,
  areaSqm: 28,
  bedrooms: 0,
  ...overrides,
});

describe("building layout", () => {
  it("keeps the complete architectural bay count while mapping public units", () => {
    const plan = computeBuildingPlan(
      [unit({}), unit({ id: "unit-204", publicLabel: "Unit 204", unitNumber: "204" })],
      [{ floorNumber: 2, label: "2nd Floor", slotCount: 4 }],
    );

    expect(plan.floors).toHaveLength(1);
    expect(plan.floors[0]!.slots).toHaveLength(4);
    expect(plan.floors[0]!.slots.map((slot) => slot.unit?.publicLabel ?? null)).toEqual([
      null,
      "Unit 202",
      null,
      "Unit 204",
    ]);
  });

  it("returns finite camera poses for stacked and exploded views", () => {
    for (const view of [defaultView(6), explodedView(6)]) {
      expect(Object.values(view.position).every(Number.isFinite)).toBe(true);
      expect(Object.values(view.target).every(Number.isFinite)).toBe(true);
    }
  });

  it("dims units that do not match the selected public filters", () => {
    const candidate = unit({ floorNumber: 4, monthlyRent: 24_000, areaSqm: 38, unitTypeCode: "1BR" });
    expect(unitMatchesFilters(candidate, { floor: 4, typeCode: "1BR", maxRent: 25_000 })).toBe(true);
    expect(unitMatchesFilters(candidate, { floor: 5 })).toBe(false);
    expect(unitMatchesFilters(candidate, { maxRent: 20_000 })).toBe(false);
  });

  it("keeps keyboard traversal stable from lower to higher floors", () => {
    const ordered = sortUnitsForKeyboard([
      unit({ id: "unit-401", publicLabel: "Unit 401", unitNumber: "401", floorNumber: 4 }),
      unit({ id: "unit-203", publicLabel: "Unit 203", unitNumber: "203", floorNumber: 2 }),
      unit({ id: "unit-202", publicLabel: "Unit 202", unitNumber: "202", floorNumber: 2 }),
    ]);

    expect(ordered.map((item) => item.publicLabel)).toEqual(["Unit 202", "Unit 203", "Unit 401"]);
  });
});
