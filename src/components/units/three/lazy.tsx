"use client";

import dynamic from "next/dynamic";

function ScenePlaceholder({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-sm text-neutral-500"
      style={{ height }}
      role="status"
    >
      Loading 3D view…
    </div>
  );
}

/** Client-only, code-split wrappers: keeps the Three.js bundle out of initial page loads. */
export const Building3DLazy = dynamic(() => import("@/components/units/Building3D").then((mod) => ({ default: mod.Building3D })), {
  ssr: false,
  loading: () => <ScenePlaceholder height={520} />,
});

export const BuildingExperience3DLazy = dynamic(() => import("@/components/units/three/BuildingExperience3D").then((mod) => ({ default: mod.BuildingExperience3D })), {
  ssr: false,
  loading: () => <ScenePlaceholder height={520} />,
});

export const UnitInterior3DLazy = dynamic(() => import("@/components/units/UnitInterior3D").then((mod) => ({ default: mod.UnitInterior3D })), {
  ssr: false,
  loading: () => <ScenePlaceholder height={380} />,
});

export const InteriorExperience3DLazy = dynamic(() => import("@/components/units/three/InteriorExperience3D").then((mod) => ({ default: mod.InteriorExperience3D })), {
  ssr: false,
  loading: () => <ScenePlaceholder height={430} />,
});
