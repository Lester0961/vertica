import type { Metadata } from "next";
import { PublicPagePlaceholder } from "@/components/layout/PublicPagePlaceholder";

export const metadata: Metadata = { title: "Explore building" };

export default function ExplorePage() {
  return (
    <PublicPagePlaceholder
      eyebrow="Interactive building"
      title="Explore the building"
      description="A lightweight building explorer with a floor selector and highlighted available units. The public viewer shows only Available / Not available and never reveals protected occupancy details."
      phase="Phase 13 (3D and 360)"
    />
  );
}
