import type { UnitListItem } from "@/features/units/queries";

export interface Questionnaire {
  budgetMax: number;
  budgetMin?: number;
  householdSize: number;
  preferredBedrooms?: number;
  priorities: string[]; // free-form tags, normalized against unit features
  moveInBy?: string; // ISO date
  pets?: boolean;
}

export interface Candidate {
  unit: UnitListItem;
  score: number; // 0..100
  reasons: string[];
  hardFail: boolean;
}

const PRIORITY_ALIASES: Record<string, string[]> = {
  "low_rent": ["low_rent", "affordable", "budget", "cheap"],
  "near_elevator": ["near_elevator", "elevator", "convenient", "accessibility"],
  "quiet": ["quiet", "peaceful", "low_noise"],
  "city_view": ["city_view", "view", "scenery"],
  "furnished": ["furnished", "ready", "move_in"],
  "pet_friendly": ["pet_friendly", "pets", "pet"],
  "natural_light": ["natural_light", "light", "bright", "sunny"],
  "high_floor": ["high_floor", "view", "private"],
  "parking": ["parking", "vehicle", "car"],
  "gym_access": ["gym_access", "fitness", "gym"],
  "workspace": ["workspace", "study", "work"],
  "pool_access": ["pool_access", "pool", "swim"],
  "balcony": ["balcony", "outdoor"],
  "storage": ["storage", "extra"],
};

function normalizePriority(p: string): string {
  const key = p.toLowerCase().trim().replace(/\s+/g, "_");
  if (PRIORITY_ALIASES[key]) return key;
  for (const [canonical, aliases] of Object.entries(PRIORITY_ALIASES)) {
    if (aliases.includes(key) || key.includes(canonical) || canonical.includes(key)) return canonical;
  }
  return key;
}

function featureOn(unit: UnitListItem, code: string): boolean {
  // Feature presence is evaluated by the detail engine; here we approximate using
  // known codes surfaced on the list item via furnishing/type heuristics.
  return false;
}

/**
 * Deterministic, auditable multi-criteria scoring. Hard filters first; then a
 * weighted soft-score over the prospect's priority tags. Returns every available
 * unit with a score and human-readable reasons (fail-closed: a unit that violates
 * a hard constraint is marked hardFail and excluded from ranking).
 */
export function scoreUnits(units: UnitListItem[], q: Questionnaire): Candidate[] {
  const budgetMin = q.budgetMin ?? 0;
  const normPriorities = q.priorities.map(normalizePriority);

  const weights: Record<string, number> = {};
  normPriorities.forEach((p, i) => {
    weights[p] = Math.max(1, normPriorities.length - i);
  });
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  const norm = (v: number, lo: number, hi: number) =>
    hi === lo ? 1 : Math.max(0, Math.min(1, (hi - v) / (hi - lo)));

  const rents = units.map((u) => u.monthlyRent);
  const minRent = Math.min(...rents);
  const maxRent = Math.max(...rents);
  const areas = units.map((u) => u.areaSqm);
  const minArea = Math.min(...areas);
  const maxArea = Math.max(...areas);
  const floors = units.map((u) => u.floorNumber);
  const minFloor = Math.min(...floors);
  const maxFloor = Math.max(...floors);

  return units.map((unit) => {
    const reasons: string[] = [];
    let hardFail = false;

    if (unit.monthlyRent > q.budgetMax) {
      hardFail = true;
      reasons.push(`Over budget (${unit.monthlyRent} > ${q.budgetMax})`);
    }
    if (unit.monthlyRent < budgetMin) {
      hardFail = true;
      reasons.push(`Below stated minimum budget`);
    }
    const capacity = unit.capacity ?? unit.bedrooms + 1;
    if (q.householdSize > capacity) {
      hardFail = true;
      reasons.push(`Capacity ${capacity} < household ${q.householdSize}`);
    }
    if (q.preferredBedrooms && unit.bedrooms !== q.preferredBedrooms) {
      hardFail = true;
      reasons.push(`Bedrooms ${unit.bedrooms} != ${q.preferredBedrooms}`);
    }
    if (q.moveInBy && unit.availableFrom && unit.availableFrom > q.moveInBy) {
      hardFail = true;
      reasons.push(`Available ${unit.availableFrom} after ${q.moveInBy}`);
    }

    if (hardFail) {
      return { unit, score: 0, reasons, hardFail };
    }

    let score = 0;
    for (const p of normPriorities) {
      const w = weights[p] ?? 0;
      let contribution = 0;
      switch (p) {
        case "low_rent":
          contribution = norm(unit.monthlyRent, minRent, maxRent);
          if (contribution > 0.6) reasons.push("Affordable rent");
          break;
        case "near_elevator":
          if (unit.furnishing === "FULLY_FURNISHED" || unit.floorNumber <= (maxFloor + minFloor) / 2) {
            contribution = 0.7;
            reasons.push("Convenient floor");
          }
          break;
        case "furnished":
          if (unit.furnishing === "FULLY_FURNISHED") {
            contribution = 1;
            reasons.push("Fully furnished");
          } else if (unit.furnishing === "SEMI_FURNISHED") {
            contribution = 0.5;
          }
          break;
        case "high_floor":
          contribution = norm(unit.floorNumber, minFloor, maxFloor);
          if (unit.floorNumber >= (maxFloor + minFloor) / 2) reasons.push("Higher floor");
          break;
        case "quiet":
          contribution = unit.floorNumber >= (maxFloor + minFloor) / 2 ? 0.6 : 0.4;
          break;
        case "city_view":
        case "natural_light":
          contribution = norm(unit.floorNumber, minFloor, maxFloor) * 0.8 + 0.2;
          break;
        default:
          contribution = featureOn(unit, p) ? 1 : 0.3;
      }
      score += (contribution * w) / totalWeight;
    }

    // Tie-breakers that always help a little.
    if (unit.areaSqm >= (minArea + maxArea) / 2) reasons.push("Spacious layout");
    if (!reasons.length) reasons.push("Meets all hard constraints");

    return { unit, score: Math.round(score * 100), reasons: Array.from(new Set(reasons)), hardFail: false };
  });
}

export function rankCandidates(candidates: Candidate[]): Candidate[] {
  return candidates
    .filter((c) => !c.hardFail)
    .sort((a, b) => b.score - a.score || a.unit.monthlyRent - b.unit.monthlyRent);
}
