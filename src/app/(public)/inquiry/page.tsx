import type { Metadata } from "next";
import { PublicPagePlaceholder } from "@/components/layout/PublicPagePlaceholder";

export const metadata: Metadata = { title: "Send an inquiry" };

export default function InquiryPage() {
  return (
    <PublicPagePlaceholder
      eyebrow="Get in touch"
      title="Send an inquiry"
      description="Share your contact details and unit interest and the team will follow up with next steps. Submitting an inquiry is not yet an approved reservation."
      phase="Phase 7 (CRM and inquiries)"
    />
  );
}
