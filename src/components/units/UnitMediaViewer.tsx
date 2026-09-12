"use client";

import { useState } from "react";
import Image from "next/image";
import type { UnitDetail } from "@/features/units/queries";
import dynamic from "next/dynamic";
import { Unit204FloorPlan } from "./Unit204FloorPlan";
const ResidenceViewer = dynamic(() => import("./three/ResidenceViewer"), { ssr: false, loading: () => <div className="flex h-[400px] items-center justify-center rounded-xl bg-neutral-100" role="status">Preparing your residence…</div> });

type MediaMode = "photo" | "three" | "plan";

export function UnitMediaViewer({ unit }: { unit: UnitDetail }) {
  const [mode, setMode] = useState<MediaMode>(unit.publicLabel === "Unit 204" ? "plan" : "three");

  return (
    <section aria-label={`${unit.publicLabel} media`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Explore this residence</h2>
          <p className="mt-1 text-xs text-neutral-500">
            See the layout from above, or explore each room at eye level.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-neutral-300" role="tablist" aria-label="Unit media">
          {unit.publicLabel === "Unit 204" && <button type="button" role="tab" aria-selected={mode === "plan"} onClick={()=>setMode("plan")} className={mode === "plan" ? "bg-emerald-800 px-3 py-2 text-xs font-semibold text-white" : "px-3 py-2 text-xs font-semibold"}>2D floor plan</button>}
          <button
            type="button"
            role="tab"
            aria-selected={mode === "photo"}
            onClick={() => setMode("photo")}
            className={mode === "photo" ? "bg-neutral-900 px-3 py-2 text-xs font-semibold text-white" : "bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"}
          >
            Photo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "three"}
            onClick={() => setMode("three")}
            className={mode === "three" ? "bg-emerald-800 px-3 py-2 text-xs font-semibold text-white" : "bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"}
          >
            3D tour
          </button>
        </div>
      </div>

      <div role="tabpanel">
        {mode === "plan" ? <Unit204FloorPlan /> : mode === "photo" ? (
          <div className="relative h-[430px] overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
            <Image
              src="/images/vertica/vertica-residence.webp"
              alt="Fictional Vertica residence artist visualization"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="object-cover"
            />
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/85 to-transparent px-5 pb-4 pt-16 text-xs text-white">
              Artist visualization. Furniture, finishes, and views are illustrative.
            </p>
          </div>
        ) : (
          <ResidenceViewer key={unit.id} unit={unit} />
        )}
      </div>
    </section>
  );
}
