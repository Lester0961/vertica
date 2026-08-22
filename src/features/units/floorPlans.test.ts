import { describe, expect, it } from "vitest";
import {
  FLOOR_PLANS,
  furnitureForLevel,
  getFloorPlan,
  hasBalconyFeature,
  orientationToDegrees,
  roomsWithinBounds,
  wallOpeningsWithinSegments,
} from "@/features/units/floorPlans";

describe("unit floor plans", () => {
  it("defines valid Studio, 1BR, and 2BR plans", () => {
    expect(Object.keys(FLOOR_PLANS)).toEqual(["STUDIO", "1BR", "2BR"]);
    for (const plan of Object.values(FLOOR_PLANS)) {
      expect(roomsWithinBounds(plan)).toBe(true);
      expect(wallOpeningsWithinSegments(plan)).toBe(true);
      expect(plan.rooms.some((room) => room.id === plan.livingRoomId)).toBe(true);
    }
  });

  it("falls back to bedroom count when a unit type code is unavailable", () => {
    expect(getFloorPlan(undefined, 0).unitTypeCode).toBe("STUDIO");
    expect(getFloorPlan("UNKNOWN", 1).unitTypeCode).toBe("1BR");
    expect(getFloorPlan(null, 2).unitTypeCode).toBe("2BR");
  });

  it("shows only built-ins for bare units and all decor for furnished units", () => {
    const plan = FLOOR_PLANS.STUDIO!;
    const bare = furnitureForLevel(plan, "UNFURNISHED");
    const furnished = furnitureForLevel(plan, "FURNISHED");

    expect(bare.every((item) => item.level === "base")).toBe(true);
    expect(furnished).toHaveLength(plan.furniture.length);
    expect(furnished.length).toBeGreaterThan(bare.length);
  });

  it("normalizes orientation and public balcony data", () => {
    expect(orientationToDegrees("West")).toBe(90);
    expect(orientationToDegrees(null)).toBe(0);
    expect(hasBalconyFeature([{ code: "balcony", valueBoolean: true }])).toBe(true);
    expect(hasBalconyFeature([{ code: "balcony", valueBoolean: false }])).toBe(false);
  });
});
