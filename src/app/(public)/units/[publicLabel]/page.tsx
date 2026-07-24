import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UnitDetailCard } from "@/components/units/UnitDetailCard";
import { getPublicUnitByLabel } from "@/features/units/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicLabel: string }>;
}): Promise<Metadata> {
  const { publicLabel } = await params;
  return { title: `Unit ${decodeURIComponent(publicLabel)}` };
}

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ publicLabel: string }>;
}) {
  const { publicLabel } = await params;
  const unit = await getPublicUnitByLabel(decodeURIComponent(publicLabel));
  if (!unit) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/units" className="text-sm text-neutral-500 hover:text-neutral-700">
        ← All units
      </Link>
      <div className="mt-4">
        <UnitDetailCard unit={unit} />
      </div>
    </main>
  );
}
