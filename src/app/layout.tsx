import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vertica Residences",
    template: "%s · Vertica",
  },
  description:
    "A home chosen around the way you live. Thoughtfully planned residences, clear unit information, live availability, and an explainable recommendation assistant.",
  applicationName: "Vertica",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0b",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
