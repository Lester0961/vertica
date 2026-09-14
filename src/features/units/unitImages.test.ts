import { describe, expect, it } from "vitest";
import { getUnitImage } from "@/features/units/unitImages";

describe("unit image resolver", () => {
  it("uses the studio asset family for studio units", () => {
    expect(getUnitImage({ publicLabel: "Unit 202", unitTypeCode: "STUDIO" }).src)
      .toContain("/images/vertica/units/studio-");
  });

  it("uses the one-bedroom asset family for one-bedroom units", () => {
    expect(getUnitImage({ publicLabel: "Unit 203", unitTypeCode: "1BR" }).src)
      .toContain("/images/vertica/units/one-bedroom-");
  });

  it("pins Unit 204 to the centered-balcony image", () => {
    expect(getUnitImage({ publicLabel: "Unit 204", unitTypeCode: "2BR" }).src)
      .toBe("/images/vertica/units/two-bedroom-204.png");
  });

  it("keeps the same unit image stable across surfaces", () => {
    const first = getUnitImage({ publicLabel: "Unit 404", unitTypeCode: "2BR" });
    const second = getUnitImage({ publicLabel: "Unit 404", unitTypeName: "Two-Bedroom" });
    expect(second.src).toBe(first.src);
    expect(second.alt).toContain("Unit 404");
  });
});
