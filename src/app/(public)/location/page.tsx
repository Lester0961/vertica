import type { Metadata } from "next";
import { PublicPagePlaceholder } from "@/components/layout/PublicPagePlaceholder";

export const metadata: Metadata = { title: "Location" };

export default function LocationPage() {
  return (
    <PublicPagePlaceholder
      eyebrow="Connected to your day"
      title="Location"
      description="Map, property address, and nearby establishments. Distances must come from a verified dataset and state whether they are road distance, straight-line, or estimated travel time (see VERIFY.md)."
      phase="Phase 4 (landing content)"
    />
  );
}
