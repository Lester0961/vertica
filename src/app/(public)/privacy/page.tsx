import type { Metadata } from "next";
import { PublicPagePlaceholder } from "@/components/layout/PublicPagePlaceholder";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PublicPagePlaceholder
      eyebrow="Your data"
      title="Privacy notice"
      description="Vertica collects only the information needed to process inquiries, recommendations, and resident services. The production privacy notice wording is versioned and pending approval before release (see VERIFY.md)."
      phase="Legal verification (VERIFY.md)"
    />
  );
}
