import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { ok, fail } from "@/lib/api/response";
import { type ApiContext, register } from "@/lib/api/router";
import { listPublicUnits } from "@/features/units/queries";
import { rankCandidates, scoreUnits, type Questionnaire } from "@/features/recommendations/engine";

const questionnaireSchema = z.object({
  budgetMax: z.number().positive().max(10_000_000),
  budgetMin: z.number().nonnegative().max(10_000_000).optional(),
  householdSize: z.number().int().min(1).max(20),
  preferredBedrooms: z.number().int().min(0).max(10).optional(),
  priorities: z.array(z.string()).max(12),
  moveInBy: z.string().optional(),
  pets: z.boolean().optional(),
});

async function recommendHandler(ctx: ApiContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.");
  }
  const parsed = questionnaireSchema.safeParse(body);
  if (!parsed.success) {
    return fail("BAD_REQUEST", "Invalid questionnaire.", { issues: parsed.error.issues });
  }

  const q: Questionnaire = parsed.data;
  const units = await listPublicUnits({});
  const candidates = scoreUnits(units, q);
  const ranked = rankCandidates(candidates);

  // Best-effort audit persistence (write-only; no PII). Falls back gracefully
  // if RLS disallows inserts — recommendations are still returned.
  const sessionId = randomUUID();
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const secretHash = createHash("sha256")
      .update(JSON.stringify(q) + sessionId)
      .digest("hex");

    const ins = await supabase.from("recommendation_sessions").insert({
      id: sessionId,
      config_version: "1.0.0",
      questionnaire: q as unknown as Record<string, unknown>,
      secret_hash: secretHash,
      expires_at: new Date(Date.now() + 90 * 86400_000).toISOString(),
      completed_at: new Date().toISOString(),
    });
    void ins;

    const candidates = scoreUnits(units, q);
    const candidateRows = candidates.map((c, i) => ({
      session_id: sessionId,
      unit_id: c.unit.id,
      unit_snapshot: c.unit as unknown as Record<string, unknown>,
      is_eligible: !c.hardFail,
      evaluation_order: i + 1,
    }));
    if (candidateRows.length) {
      await supabase.from("recommendation_candidates").insert(candidateRows);
    }
    const rows = ranked.slice(0, 10).map((c, i) => ({
      session_id: sessionId,
      unit_id: c.unit.id,
      rank: i + 1,
      score: c.score,
      band: c.score >= 75 ? "strong" : c.score >= 50 ? "good" : "fair",
      explanation: c.reasons.join("; "),
      config_version: "1.0.0",
      unit_snapshot: c.unit as unknown as Record<string, unknown>,
    }));
    if (rows.length) await supabase.from("recommendation_results").insert(rows);
  } catch {
    // Non-fatal: recommendations are still returned.
  }

  return ok({
    sessionId,
    count: ranked.length,
    recommendations: ranked.slice(0, 10).map((c) => ({
      publicLabel: c.unit.publicLabel,
      unitTypeCode: c.unit.unitTypeCode,
      bedrooms: c.unit.bedrooms,
      bathrooms: c.unit.bathrooms,
      floorNumber: c.unit.floorNumber,
      areaSqm: c.unit.areaSqm,
      monthlyRent: c.unit.monthlyRent,
      monthlyDues: c.unit.monthlyDues,
      score: c.score,
      reasons: c.reasons,
    })),
  });
}

export function registerRecommendationRoutes(): void {
  register("POST", "recommendations", recommendHandler);
}
