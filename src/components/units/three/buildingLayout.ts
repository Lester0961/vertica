/**
 * Pure layout engine for the procedural condominium tower. No Three.js
 * imports — this module only computes numbers, so it is unit-testable and
 * could later feed a GLB-based pipeline (cf. the `unit_visual_positions`
 * table) without touching scene code.
 *
 * Building type: a single-loaded residential slab — a row of unit bays
 * facing south (front, +z), an open-air external corridor across the back
 * (common in Philippine condos), and an elevator/stair core tower rising
 * behind the corridor at the center.
 */

export const FLOOR_HEIGHT = 3.0;
export const LOBBY_HEIGHT = 4.2;
export const EXPLODE_GAP = 2.4;

export const PLATE = {
  width: 22.8,
  depth: 10.4,
  bayWidth: 5.7,
  unitDepth: 7.8,
  unitCenterZ: 1.3,
  corridorDepth: 2.6,
  corridorCenterZ: -3.9,
  coreWidth: 4.0,
  coreDepth: 3.8,
  coreCenterZ: -3.3,
  unitHeight: 2.7,
  slabThickness: 0.25,
} as const;

export interface BuildingUnit3D {
  id: string;
  publicLabel: string;
  unitTypeName: string;
  floorNumber: number;
  status?: string;
  unitNumber?: string;
  areaSqm?: number;
  bedrooms?: number;
  monthlyRent?: number;
  unitTypeCode?: string;
}

export interface FloorLayoutInfo {
  floorNumber: number;
  label: string;
  slotCount: number;
}

/** Slot 0..3 = unit numbers N01..N04 (bay from west to east across the front face). */
export function slotIndexFromUnitNumber(unitNumber: string | undefined, slotCount: number, fallbackIndex = 0): number {
  if (!unitNumber) return clamp(fallbackIndex, 0, slotCount - 1);
  const digits = unitNumber.slice(-2);
  const parsed = parseInt(digits, 10);
  if (Number.isNaN(parsed)) return clamp(fallbackIndex, 0, slotCount - 1);
  return clamp(parsed - 1, 0, slotCount - 1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** First free slot when the unit number is missing or collides. */
function firstFreeSlot(taken: boolean[], slotCount: number, preferred: number): number {
  if (!taken[preferred] && preferred < slotCount) return preferred;
  for (let index = 0; index < slotCount; index += 1) if (!taken[index]) return index;
  return preferred;
}

export interface SlotAssignment {
  slotIndex: number;
  unit?: BuildingUnit3D;
}

export interface FloorPlanLayout {
  floorNumber: number;
  label: string;
  slots: SlotAssignment[];
}

export interface BuildingPlan {
  floors: FloorPlanLayout[];
  minFloor: number;
  maxFloor: number;
}

/**
 * Combine a floor layout (slot counts only — safe to expose publicly) with
 * unit records (which may cover only some slots, e.g. only AVAILABLE units).
 */
export function computeBuildingPlan(units: BuildingUnit3D[], floors?: FloorLayoutInfo[]): BuildingPlan {
  const floorInfos: FloorLayoutInfo[] =
    floors && floors.length > 0
      ? [...floors].sort((a, b) => a.floorNumber - b.floorNumber)
      : Array.from(new Set(units.map((unit) => unit.floorNumber)))
          .sort((a, b) => a - b)
          .map((floorNumber) => {
            const floorUnits = units.filter((unit) => unit.floorNumber === floorNumber);
            return { floorNumber, label: `Floor ${floorNumber}`, slotCount: Math.max(1, floorUnits.length) };
          });

  const plan: FloorPlanLayout[] = floorInfos.map((floor) => {
    const slots: SlotAssignment[] = Array.from({ length: floor.slotCount }, (_, slotIndex) => ({ slotIndex }));
    const taken = new Array<boolean>(floor.slotCount).fill(false);
    units
      .filter((unit) => unit.floorNumber === floor.floorNumber)
      .sort((a, b) => a.publicLabel.localeCompare(b.publicLabel))
      .forEach((unit, fallbackIndex) => {
        const preferred = slotIndexFromUnitNumber(unit.unitNumber, floor.slotCount, fallbackIndex);
        const slotIndex = firstFreeSlot(taken, floor.slotCount, preferred);
        taken[slotIndex] = true;
        const existing = slots[slotIndex];
        slots[slotIndex] = existing?.unit ? { slotIndex, unit: existing.unit } : { slotIndex, unit };
      });
    return { floorNumber: floor.floorNumber, label: floor.label, slots };
  });

  const numbers = plan.map((floor) => floor.floorNumber);
  return {
    floors: plan,
    minFloor: numbers.length > 0 ? Math.min(...numbers) : 1,
    maxFloor: numbers.length > 0 ? Math.max(...numbers) : 1,
  };
}

export interface UnitTransform {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
}

/** Y of a floor's walking surface (top of its slab). */
export function floorY(floorNumber: number, minFloor: number): number {
  return LOBBY_HEIGHT + (floorNumber - minFloor) * FLOOR_HEIGHT;
}

export function explodedFloorY(floorNumber: number, minFloor: number): number {
  return floorY(floorNumber, minFloor) + (floorNumber - minFloor) * EXPLODE_GAP;
}

/** Unit width within its bay — bigger unit types read as wider volumes. */
export function unitBayWidth(unit: BuildingUnit3D): number {
  const base = PLATE.bayWidth;
  if (unit.bedrooms === undefined) return base;
  if (unit.bedrooms === 0) return base * 0.82;
  if (unit.bedrooms === 1) return base * 0.92;
  return base;
}

export function slotCenterX(slotIndex: number, slotCount: number): number {
  const spacing = PLATE.width / Math.max(slotCount, 1);
  return -PLATE.width / 2 + spacing * (slotIndex + 0.5);
}

export function unitTransform(unit: BuildingUnit3D, slotIndex: number, slotCount: number, minFloor: number, y: number): UnitTransform {
  return {
    position: [slotCenterX(slotIndex, slotCount), y + PLATE.unitHeight / 2, PLATE.unitCenterZ],
    width: unitBayWidth(unit) * (slotCount > 4 ? 4 / slotCount : 1),
    depth: PLATE.unitDepth,
    height: PLATE.unitHeight,
  };
}

export interface ViewPose {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export function defaultView(floorCount: number): ViewPose {
  const top = LOBBY_HEIGHT + floorCount * FLOOR_HEIGHT;
  return {
    position: { x: 15, y: top * 0.85, z: top * 0.9 + 8 },
    target: { x: 0, y: top * 0.45, z: 0 },
  };
}

export function explodedView(floorCount: number): ViewPose {
  const top = LOBBY_HEIGHT + floorCount * (FLOOR_HEIGHT + EXPLODE_GAP);
  return {
    position: { x: 20, y: top * 0.8, z: top * 0.95 + 10 },
    target: { x: 0, y: top * 0.45, z: 0 },
  };
}

/** Camera pose framing a single unit volume from its front (south) face. */
export function unitView(transform: UnitTransform): ViewPose {
  const [x, y] = transform.position;
  return {
    position: { x: x * 0.7, y: y + 2.2, z: PLATE.unitCenterZ + PLATE.unitDepth / 2 + 8.5 },
    target: { x, y, z: PLATE.unitCenterZ },
  };
}

export interface UnitFilters3D {
  floor?: number;
  typeCode?: string;
  minRent?: number;
  maxRent?: number;
  minArea?: number;
}

/** Whether a unit should stay fully visible; non-matching units are dimmed in the scene. */
export function unitMatchesFilters(unit: BuildingUnit3D, filters: UnitFilters3D): boolean {
  if (filters.floor !== undefined && unit.floorNumber !== filters.floor) return false;
  if (filters.typeCode && unit.unitTypeCode !== filters.typeCode) return false;
  if (filters.minRent !== undefined && (unit.monthlyRent ?? 0) < filters.minRent) return false;
  if (filters.maxRent !== undefined && (unit.monthlyRent ?? Infinity) > filters.maxRent) return false;
  if (filters.minArea !== undefined && (unit.areaSqm ?? 0) < filters.minArea) return false;
  return true;
}

/** Stable keyboard traversal order: bottom floor to top, west bay to east. */
export function sortUnitsForKeyboard(units: BuildingUnit3D[]): BuildingUnit3D[] {
  return [...units].sort((a, b) => a.floorNumber - b.floorNumber || a.publicLabel.localeCompare(b.publicLabel));
}
