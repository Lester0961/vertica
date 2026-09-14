import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-layout" style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PublicHeader />
      <div id="main-content" style={{ flex: 1 }}>{children}</div>
      <PublicFooter />
    </div>
  );
}
