/**
 * Parametric floor-plan definitions for the 3D interior walkthroughs.
 * Coordinates are meters in plan space: x → east, z → south (the window face
 * is +z). Room/furniture `x, z` are the min corner for rooms and the CENTER
 * for furniture; wall openings are positioned as a 0..1 fraction along the
 * segment. Areas are derived from the seeded unit types (26/38/58 m²), so a
 * rendered interior is dimensionally honest for its type.
 */

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface RoomDef extends Rect {
  id: string;
  name: string;
  floor: "wood" | "tile";
}

export interface WallOpening {
  at: number;
  width: number;
  kind: "door" | "window";
  sillHeight?: number;
}

export interface WallDef {
  from: [number, number];
  to: [number, number];
  openings?: WallOpening[];
}

export type FurnitureKind =
  | "bed"
  | "bedSingle"
  | "sofa"
  | "coffeeTable"
  | "diningTable"
  | "chair"
  | "wardrobe"
  | "desk"
  | "kitchenCounter"
  | "fridge"
  | "stove"
  | "toilet"
  | "shower"
  | "sink"
  | "tvUnit"
  | "plant"
  | "rug";

/** base = built-ins (bath/kitchen), semi = beds/sofa/dining/wardrobe, full = decor extras. */
export type FurnishingLevel = "base" | "semi" | "full";

export interface FurnitureItem {
  kind: FurnitureKind;
  x: number;
  z: number;
  w: number;
  d: number;
  rotY?: number;
  level: Exclude<FurnishingLevel, never>;
}

export interface FloorPlan {
  unitTypeCode: string;
  unitTypeName: string;
  overallW: number;
  overallD: number;
  rooms: RoomDef[];
  walls: WallDef[];
  furniture: FurnitureItem[];
  /** Room whose center is the default walkthrough spawn point. */
  livingRoomId: string;
}

const STUDIO: FloorPlan = {
  unitTypeCode: "STUDIO",
  unitTypeName: "Studio",
  overallW: 6.4,
  overallD: 4.6,
  livingRoomId: "main",
  rooms: [
    { id: "main", name: "Living · Sleeping", x: -3.2, z: -2.3, w: 4.4, d: 4.6, floor: "wood" },
    { id: "bath", name: "Bath", x: 1.2, z: -2.3, w: 2.0, d: 1.6, floor: "tile" },
    { id: "kitchen", name: "Kitchenette", x: 1.2, z: -0.7, w: 2.0, d: 3.0, floor: "tile" },
  ],
  walls: [
    { from: [-3.2, 2.3], to: [3.2, 2.3], openings: [{ at: 0.3125, width: 2.0, kind: "window", sillHeight: 0.9 }] },
    { from: [-3.2, -2.3], to: [3.2, -2.3], openings: [{ at: 0.82, width: 0.9, kind: "door" }] },
    { from: [3.2, -2.3], to: [3.2, 2.3], openings: [{ at: 0.674, width: 0.9, kind: "window", sillHeight: 1.1 }] },
    { from: [-3.2, -2.3], to: [-3.2, 2.3] },
    { from: [1.2, -2.3], to: [1.2, -0.7], openings: [{ at: 0.45, width: 0.75, kind: "door" }] },
    { from: [1.2, -0.7], to: [3.2, -0.7] },
  ],
  furniture: [
    { kind: "bed", x: -2.35, z: -1.2, w: 1.5, d: 2.0, level: "semi" },
    { kind: "wardrobe", x: -2.4, z: 1.9, w: 1.5, d: 0.6, level: "semi" },
    { kind: "sofa", x: -0.3, z: 0.6, w: 1.8, d: 0.8, rotY: Math.PI, level: "semi" },
    { kind: "coffeeTable", x: -0.3, z: -0.35, w: 0.9, d: 0.5, level: "full" },
    { kind: "tvUnit", x: -0.9, z: -2.0, w: 1.4, d: 0.4, level: "full" },
    { kind: "rug", x: -0.3, z: 0.5, w: 1.6, d: 1.1, level: "full" },
    { kind: "kitchenCounter", x: 2.85, z: 0.8, w: 0.6, d: 2.6, level: "base" },
    { kind: "stove", x: 2.85, z: 2.0, w: 0.58, d: 0.6, level: "base" },
    { kind: "fridge", x: 1.65, z: -0.3, w: 0.65, d: 0.7, level: "base" },
    { kind: "shower", x: 1.75, z: -1.8, w: 0.9, d: 0.9, level: "base" },
    { kind: "toilet", x: 2.7, z: -1.85, w: 0.42, d: 0.6, level: "base" },
    { kind: "sink", x: 2.75, z: -1.2, w: 0.55, d: 0.45, level: "base" },
    { kind: "plant", x: 0.7, z: 1.9, w: 0.45, d: 0.45, level: "full" },
  ],
};

const ONE_BR: FloorPlan = {
  unitTypeCode: "1BR",
  unitTypeName: "One-Bedroom",
  overallW: 7.8,
  overallD: 5.6,
  livingRoomId: "living",
  rooms: [
    { id: "living", name: "Living · Dining", x: -3.9, z: -2.8, w: 4.8, d: 5.6, floor: "wood" },
    { id: "bedroom", name: "Bedroom", x: 0.9, z: 0.2, w: 3.0, d: 2.6, floor: "wood" },
    { id: "bath", name: "Bath", x: 0.9, z: -1.6, w: 3.0, d: 1.8, floor: "tile" },
    { id: "entry", name: "Entry", x: 0.9, z: -2.8, w: 3.0, d: 1.2, floor: "wood" },
  ],
  walls: [
    {
      from: [-3.9, 2.8],
      to: [3.9, 2.8],
      openings: [
        { at: 0.269, width: 2.0, kind: "window", sillHeight: 0.9 },
        { at: 0.808, width: 1.6, kind: "window", sillHeight: 0.9 },
      ],
    },
    {
      from: [-3.9, -2.8],
      to: [3.9, -2.8],
      openings: [
        { at: 0.141, width: 1.0, kind: "window", sillHeight: 1.1 },
        { at: 0.808, width: 0.9, kind: "door" },
      ],
    },
    { from: [3.9, -2.8], to: [3.9, 2.8] },
    { from: [-3.9, -2.8], to: [-3.9, 2.8] },
    { from: [0.9, 0.2], to: [0.9, 2.8], openings: [{ at: 0.15, width: 0.8, kind: "door" }] },
    { from: [0.9, 0.2], to: [3.9, 0.2] },
    { from: [0.9, -1.6], to: [3.9, -1.6], openings: [{ at: 0.25, width: 0.75, kind: "door" }] },
    { from: [0.9, -1.6], to: [0.9, 0.2] },
    { from: [0.9, -2.8], to: [0.9, -1.6], openings: [{ at: 0.45, width: 0.9, kind: "door" }] },
  ],
  furniture: [
    { kind: "kitchenCounter", x: -2.5, z: -2.35, w: 2.4, d: 0.62, level: "base" },
    { kind: "stove", x: -1.55, z: -2.35, w: 0.6, d: 0.58, level: "base" },
    { kind: "fridge", x: -3.5, z: -2.3, w: 0.65, d: 0.7, level: "base" },
    { kind: "diningTable", x: -1.5, z: -0.9, w: 1.15, d: 0.75, level: "semi" },
    { kind: "chair", x: -1.5, z: -1.45, w: 0.42, d: 0.42, rotY: Math.PI, level: "semi" },
    { kind: "chair", x: -1.5, z: -0.35, w: 0.42, d: 0.42, level: "semi" },
    { kind: "sofa", x: -2.2, z: 1.4, w: 2.0, d: 0.85, rotY: Math.PI, level: "semi" },
    { kind: "coffeeTable", x: -2.2, z: 0.2, w: 0.9, d: 0.5, level: "full" },
    { kind: "rug", x: -2.2, z: 0.9, w: 1.7, d: 1.2, level: "full" },
    { kind: "tvUnit", x: -2.2, z: 2.5, w: 1.4, d: 0.4, level: "full" },
    { kind: "desk", x: -0.7, z: 2.3, w: 1.1, d: 0.55, level: "full" },
    { kind: "plant", x: -3.55, z: 2.4, w: 0.45, d: 0.45, level: "full" },
    { kind: "bed", x: 3.0, z: 1.35, w: 1.5, d: 2.0, rotY: Math.PI / 2, level: "semi" },
    { kind: "wardrobe", x: 1.7, z: 2.45, w: 1.4, d: 0.6, level: "semi" },
    { kind: "shower", x: 3.3, z: -0.6, w: 0.95, d: 0.95, level: "base" },
    { kind: "toilet", x: 3.55, z: -1.1, w: 0.42, d: 0.6, level: "base" },
    { kind: "sink", x: 1.5, z: -1.25, w: 0.55, d: 0.45, level: "base" },
  ],
};

const TWO_BR: FloorPlan = {
  unitTypeCode: "2BR",
  unitTypeName: "Two-Bedroom",
  overallW: 11.0,
  overallD: 6.4,
  livingRoomId: "living",
  rooms: [
    { id: "living", name: "Living · Dining", x: -5.5, z: -0.6, w: 7.0, d: 3.8, floor: "wood" },
    { id: "kitchen", name: "Kitchen", x: -5.5, z: -3.2, w: 3.5, d: 2.6, floor: "tile" },
    { id: "utility", name: "Utility", x: -2.0, z: -3.2, w: 2.0, d: 2.6, floor: "tile" },
    { id: "entry", name: "Entry", x: 0.0, z: -3.2, w: 1.5, d: 2.6, floor: "wood" },
    { id: "br2", name: "Bedroom 2", x: 1.5, z: -3.2, w: 4.0, d: 2.0, floor: "wood" },
    { id: "hall", name: "Hall", x: 1.5, z: -1.2, w: 1.8, d: 1.8, floor: "wood" },
    { id: "bath", name: "Bath", x: 3.3, z: -1.2, w: 2.2, d: 1.8, floor: "tile" },
    { id: "master", name: "Master Bedroom", x: 1.5, z: 0.6, w: 4.0, d: 2.6, floor: "wood" },
  ],
  walls: [
    {
      from: [-5.5, 3.2],
      to: [5.5, 3.2],
      openings: [
        { at: 0.236, width: 2.0, kind: "window", sillHeight: 0.9 },
        { at: 0.818, width: 1.8, kind: "window", sillHeight: 0.9 },
      ],
    },
    {
      from: [-5.5, -3.2],
      to: [5.5, -3.2],
      openings: [
        { at: 0.1045, width: 1.0, kind: "window", sillHeight: 1.1 },
        { at: 0.568, width: 0.9, kind: "door" },
      ],
    },
    { from: [5.5, -3.2], to: [5.5, 3.2], openings: [{ at: 0.156, width: 0.8, kind: "window", sillHeight: 1.1 }] },
    { from: [-5.5, -3.2], to: [-5.5, 3.2] },
    { from: [-2.0, -3.2], to: [-2.0, -0.6] },
    { from: [0.0, -3.2], to: [0.0, -0.6], openings: [{ at: 0.55, width: 0.8, kind: "door" }] },
    { from: [0.0, -0.6], to: [1.5, -0.6], openings: [{ at: 0.45, width: 1.1, kind: "door" }] },
    { from: [1.5, -3.2], to: [1.5, -1.2], openings: [{ at: 0.35, width: 0.8, kind: "door" }] },
    { from: [1.5, -1.2], to: [3.3, -1.2] },
    { from: [3.3, -1.2], to: [5.5, -1.2] },
    { from: [3.3, -1.2], to: [3.3, 0.6], openings: [{ at: 0.5, width: 0.75, kind: "door" }] },
    { from: [1.5, 0.6], to: [5.5, 0.6] },
    { from: [1.5, 0.6], to: [1.5, 3.2], openings: [{ at: 0.15, width: 0.85, kind: "door" }] },
  ],
  furniture: [
    { kind: "kitchenCounter", x: -5.1, z: -1.9, w: 0.62, d: 2.3, level: "base" },
    { kind: "stove", x: -5.1, z: -1.0, w: 0.6, d: 0.58, level: "base" },
    { kind: "fridge", x: -2.45, z: -2.85, w: 0.65, d: 0.7, level: "base" },
    { kind: "sofa", x: -2.4, z: 0.4, w: 2.2, d: 0.9, rotY: Math.PI, level: "semi" },
    { kind: "coffeeTable", x: -2.4, z: 1.6, w: 1.0, d: 0.55, level: "full" },
    { kind: "rug", x: -2.4, z: 1.5, w: 1.9, d: 1.3, level: "full" },
    { kind: "tvUnit", x: -2.4, z: 2.95, w: 1.8, d: 0.4, level: "full" },
    { kind: "diningTable", x: 0.8, z: 0.3, w: 1.3, d: 0.8, level: "semi" },
    { kind: "chair", x: 0.8, z: -0.25, w: 0.42, d: 0.42, level: "semi" },
    { kind: "chair", x: 0.8, z: 0.85, w: 0.42, d: 0.42, rotY: Math.PI, level: "semi" },
    { kind: "desk", x: -5.0, z: 2.4, w: 0.6, d: 1.2, level: "full" },
    { kind: "plant", x: -5.1, z: 2.85, w: 0.45, d: 0.45, level: "full" },
    { kind: "bed", x: 4.5, z: 1.9, w: 1.6, d: 2.0, rotY: Math.PI / 2, level: "semi" },
    { kind: "wardrobe", x: 2.4, z: 0.95, w: 1.6, d: 0.6, level: "semi" },
    { kind: "bedSingle", x: 4.7, z: -2.2, w: 1.0, d: 2.0, rotY: Math.PI / 2, level: "semi" },
    { kind: "wardrobe", x: 2.2, z: -2.9, w: 1.2, d: 0.55, level: "semi" },
    { kind: "desk", x: 2.2, z: -1.6, w: 1.0, d: 0.5, level: "full" },
    { kind: "toilet", x: 5.1, z: -0.9, w: 0.42, d: 0.6, level: "base" },
    { kind: "shower", x: 5.0, z: 0.05, w: 0.95, d: 0.95, level: "base" },
    { kind: "sink", x: 3.7, z: -0.95, w: 0.55, d: 0.45, level: "base" },
  ],
};

export const FLOOR_PLANS: Record<string, FloorPlan> = {
  STUDIO,
  "1BR": ONE_BR,
  "2BR": TWO_BR,
};

/** Resolve a plan by unit type code, falling back to bedroom count. */
export function getFloorPlan(unitTypeCode?: string | null, bedrooms?: number): FloorPlan {
  if (unitTypeCode && FLOOR_PLANS[unitTypeCode]) return FLOOR_PLANS[unitTypeCode]!;
  if (bedrooms === undefined) return STUDIO;
  if (bedrooms <= 0) return STUDIO;
  if (bedrooms === 1) return ONE_BR;
  return TWO_BR;
}

/** Furnishing level → visible furniture. Null furnishing shows the "semi" showcase set. */
export function furnitureForLevel(plan: FloorPlan, furnishing?: string | null): FurnitureItem[] {
  if (furnishing === "UNFURNISHED") return plan.furniture.filter((item) => item.level === "base");
  if (furnishing === "FURNISHED") return plan.furniture;
  return plan.furniture.filter((item) => item.level !== "full");
}

const ORIENTATION_DEGREES: Record<string, number> = {
  north: 180,
  "north-east": 225,
  east: 270,
  "south-east": 135,
  south: 0,
  "south-west": 45,
  west: 90,
  "north-west": 315,
};

/** Compass orientation → rotation so the window face points that way (default south). */
export function orientationToDegrees(orientation?: string | null): number {
  if (!orientation) return 0;
  return ORIENTATION_DEGREES[orientation.trim().toLowerCase()] ?? 0;
}

export function hasBalconyFeature(features?: { code: string; valueBoolean?: boolean | null }[] | null): boolean {
  return !!features?.some((feature) => feature.code === "balcony" && feature.valueBoolean === true);
}

// ---- Validation helpers (used by unit tests).

export function planRoomArea(plan: FloorPlan): number {
  return plan.rooms.reduce((sum, room) => sum + room.w * room.d, 0);
}

export function roomsWithinBounds(plan: FloorPlan): boolean {
  const minX = -plan.overallW / 2;
  const maxX = plan.overallW / 2;
  const minZ = -plan.overallD / 2;
  const maxZ = plan.overallD / 2;
  return plan.rooms.every((room) => room.x >= minX - 1e-9 && room.x + room.w <= maxX + 1e-9 && room.z >= minZ - 1e-9 && room.z + room.d <= maxZ + 1e-9);
}

export function wallOpeningsWithinSegments(plan: FloorPlan): boolean {
  return plan.walls.every((wall) => {
    const length = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]);
    return (wall.openings ?? []).every((opening) => opening.width <= length + 1e-9 && opening.at >= 0 && opening.at <= 1);
  });
}
