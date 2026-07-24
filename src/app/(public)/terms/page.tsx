import type { Metadata } from "next";
import { PublicPagePlaceholder } from "@/components/layout/PublicPagePlaceholder";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <PublicPagePlaceholder
      eyebrow="Terms of use"
      title="Terms"
      description="This is a fictional academic project. All figures, images, distances, and claims are synthetic and provided for demonstration only. Final terms are pending approval."
      phase="Legal verification (VERIFY.md)"
    />
  );
}
