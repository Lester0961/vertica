import type { Metadata } from "next";
import { Questionnaire } from "@/components/recommendations/Questionnaire";

export const metadata: Metadata = { title: "Find your unit" };

export default function RecommendPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Decision support</p>
        <h1 className="mt-1 text-3xl font-semibold text-neutral-900">Find your unit</h1>
        <p className="mt-2 max-w-2xl text-neutral-600">
          Answer a few questions and our scoring engine ranks available homes by how well they fit your
          needs. No account required.
        </p>
      </header>
      <Questionnaire />
    </main>
  );
}
