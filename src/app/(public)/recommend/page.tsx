import type { Metadata } from "next";
import { PublicPagePlaceholder } from "@/components/layout/PublicPagePlaceholder";

export const metadata: Metadata = { title: "Find my unit" };

export default function RecommendPage() {
  return (
    <PublicPagePlaceholder
      eyebrow="Explainable unit finder"
      title="Find my unit"
      description="A short questionnaire will capture your budget, move-in timing, household size, minimum space, accessibility needs, and lifestyle priorities, then return ranked, explained recommendations."
      phase="Phase 6 (DSS experience)"
    />
  );
}
