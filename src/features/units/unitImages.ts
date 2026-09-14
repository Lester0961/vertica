export interface UnitImageInput {
  publicLabel?: string | null;
  unitTypeCode?: string | null;
  unitTypeName?: string | null;
  floorNumber?: number | null;
}

export interface UnitImage {
  src: string;
  alt: string;
}

const IMAGE_SETS = {
  STUDIO: [
    "/images/vertica/units/studio-day.png",
    "/images/vertica/units/studio-dusk.png",
    "/images/vertica/units/studio-garden.png",
  ],
  ONE_BEDROOM: [
    "/images/vertica/units/one-bedroom-day.png",
    "/images/vertica/units/one-bedroom-dusk.png",
    "/images/vertica/units/one-bedroom-garden.png",
  ],
  TWO_BEDROOM: [
    "/images/vertica/units/two-bedroom-204.png",
    "/images/vertica/units/two-bedroom-dusk.png",
    "/images/vertica/units/two-bedroom-bedroom.png",
  ],
} as const;

type UnitImageSet = keyof typeof IMAGE_SETS;

function resolveImageSet(input: UnitImageInput): UnitImageSet {
  const code = input.unitTypeCode?.toUpperCase();
  if (code === "2BR") return "TWO_BEDROOM";
  if (code === "1BR") return "ONE_BEDROOM";
  if (code === "STUDIO") return "STUDIO";

  const name = input.unitTypeName?.toLowerCase() ?? "";
  if (name.includes("two")) return "TWO_BEDROOM";
  if (name.includes("one")) return "ONE_BEDROOM";
  return "STUDIO";
}

function stableIndex(label: string | null | undefined, length: number): number {
  if (!label) return 0;
  const digits = label.match(/\d+/)?.[0];
  if (digits) {
    const weighted = [...digits].reduce(
      (total, digit, index) => total + Number(digit) * (index * 2 + 1),
      0,
    );
    return weighted % length;
  }
  let hash = 0;
  for (const character of label) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % length;
}

export function getUnitImage(input: UnitImageInput): UnitImage {
  const set = resolveImageSet(input);
  const images = IMAGE_SETS[set];
  const isUnit204 = input.publicLabel?.trim().toLowerCase() === "unit 204";
  const index = isUnit204 ? 0 : stableIndex(input.publicLabel, images.length);
  const label = input.publicLabel ?? input.unitTypeName ?? "residence";
  return {
    src: images[index]!,
    alt: `Interior artist visualization for ${label}`,
  };
}
