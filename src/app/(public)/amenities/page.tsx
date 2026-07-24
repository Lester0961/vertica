import type { Metadata } from "next";
import { PublicPagePlaceholder } from "@/components/layout/PublicPagePlaceholder";

export const metadata: Metadata = { title: "Amenities" };

export default function AmenitiesPage() {
  return (
    <PublicPagePlaceholder
      eyebrow="Designed for everyday ease"
      title="Amenities"
      description="Arrival and security, wellness, fitness, community spaces, and landscaped outdoor areas. Amenity content is pending approval against the fictional project brief (see VERIFY.md)."
      phase="Phase 4/13 (content + media)"
    />
  );
}
