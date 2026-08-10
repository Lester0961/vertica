import type { Metadata } from "next";
import { AvailabilityExplorer } from "@/components/units/AvailabilityExplorer";
export const metadata: Metadata = { title: "Explore availability" };
export default function ExplorePage() { return <main className="page-shell"><header className="page-header"><p className="eyebrow">Building explorer</p><h1>Explore available residences</h1><p>Use the floor map to compare currently available homes. Occupancy details are protected and are never displayed in this public view.</p></header><AvailabilityExplorer /></main>; }
