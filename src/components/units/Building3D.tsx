"use client";

/* eslint-disable react-hooks/immutability -- Three.js scenes and controls are intentionally imperative objects. */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/components/units/three/useThreeScene";
import { prefersReducedMotion } from "@/components/units/three/cameraRig";
import { SCENE_ENV, STATUS_COLORS, createBuildingMaterials, createMassingMaterial, createUnitMaterial } from "@/components/units/three/materials";
import {
  defaultView,
  explodedFloorY,
  explodedView,
  floorY,
  computeBuildingPlan,
  PLATE,
  sortUnitsForKeyboard,
  unitMatchesFilters,
  unitTransform,
  unitView,
  type BuildingUnit3D,
  type FloorLayoutInfo,
  type UnitFilters3D,
} from "@/components/units/three/buildingLayout";

export type { BuildingUnit3D } from "@/components/units/three/buildingLayout";

interface UnitRecord {
  unit: BuildingUnit3D;
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  floorNumber: number;
  phase: number;
  selected: boolean;
  dimmed: boolean;
  hovered: boolean;
}

export interface Building3DProps {
  units: BuildingUnit3D[];
  /** Floor slot counts without occupancy data; slots missing from `units` render as neutral massing. */
  layout?: { floors: FloorLayoutInfo[] };
  selectedId?: string;
  /** Units not matching are dimmed in place instead of being removed. */
  filters?: UnitFilters3D;
  onSelect?: (unit: BuildingUnit3D) => void;
  height?: number;
  showLegend?: boolean;
}

export function Building3D({ units, layout, selectedId, filters, onSelect, height = 520, showLegend = true }: Building3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  const prefersDark = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
    [],
  );

  const ctx = useThreeScene(hostRef, {
    ariaLabel: "Interactive 3D condominium. Drag to rotate, wheel or pinch to zoom, right-drag to pan. Click a highlighted unit for details; arrow keys move between units and Enter selects.",
  });

  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [exploded, setExploded] = useState(false);
  const handleViewerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLButtonElement) return;
    if (event.key.toLowerCase() === "e") { event.preventDefault(); setExploded((value) => !value); }
    else if (event.key.toLowerCase() === "r") { event.preventDefault(); setExploded(false); if (ctx && plan.floors.length > 0) ctx.rig.flyTo(defaultView(plan.floors.length).position, defaultView(plan.floors.length).target, 800); }
  };

  // Rebuild only when the underlying plan data changes, not on every render.
  const planKey = useMemo(
    () =>
      JSON.stringify({
        u: units
          .map((unit) => [unit.id, unit.status ?? "", unit.floorNumber, unit.unitNumber ?? "", unit.bedrooms ?? 0])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
        f: layout?.floors.map((floor) => [floor.floorNumber, floor.slotCount]) ?? null,
      }),
    [units, layout],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => computeBuildingPlan(units, layout?.floors), [planKey]);

  const recordsRef = useRef(new Map<string, UnitRecord>());
  const floorGroupsRef = useRef(new Map<number, THREE.Group>());
  const floorTargetsRef = useRef(new Map<number, number>());
  const interactiveRef = useRef<THREE.Mesh[]>([]);

  // ---- Scene content: environment built once, building rebuilt on plan change.
  useEffect(() => {
    if (!ctx) return;
    const env = SCENE_ENV[prefersDark ? "dark" : "light"];
    ctx.scene.background = new THREE.Color(env.background);
    ctx.scene.fog = new THREE.Fog(env.fog, 45, 120);

    const materials = createBuildingMaterials(prefersDark);
    const hemi = new THREE.HemisphereLight(0xffffff, prefersDark ? 0x39402f : 0x6c756b, 2.4);
    const sun = new THREE.DirectionalLight(0xfff6e8, 3.2);
    sun.position.set(18, 30, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 34;
    sun.shadow.camera.bottom = -6;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.0004;
    const fill = new THREE.DirectionalLight(0xdfeaff, 0.7);
    fill.position.set(-14, 12, -10);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.06, 14), materials.plaza);
    walkway.position.set(0, 0.03, PLATE.depth / 2 + 7);
    walkway.receiveShadow = true;

    const contextGroup = new THREE.Group();
    contextGroup.add(hemi, sun, fill, ground, walkway);
    // Street trees in planters along the front walk.
    [-14, -7.5, 7.5, 14].forEach((x) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.1, 8), materials.trunk);
      trunk.position.y = 1.05;
      trunk.castShadow = true;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), materials.foliage);
      crown.position.y = 2.5;
      crown.castShadow = true;
      const crownTop = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), materials.foliage);
      crownTop.position.set(0.3, 3.3, 0.15);
      const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.5, 10), materials.concreteDark);
      planter.position.y = 0.25;
      planter.castShadow = true;
      planter.receiveShadow = true;
      tree.add(trunk, crown, crownTop, planter);
      tree.position.set(x, 0, PLATE.depth / 2 + 11.5);
      contextGroup.add(tree);
    });
    ctx.scene.add(contextGroup);

    return () => {
      ctx.scene.remove(contextGroup);
      ctx.disposeSubtree(contextGroup);
      materials.dispose();
      ctx.scene.background = null;
      ctx.scene.fog = null;
    };
  }, [ctx, prefersDark]);

  // ---- Building geometry.
  useEffect(() => {
    if (!ctx || plan.floors.length === 0) return;
    const records = new Map<string, UnitRecord>();
    const floorGroups = new Map<number, THREE.Group>();
    const interactive: THREE.Mesh[] = [];
    const building = new THREE.Group();
    const materials = createBuildingMaterials(prefersDark);
    const floorCount = plan.floors.length;
    const topY = floorY(plan.maxFloor, plan.minFloor) + PLATE.unitHeight + 0.4;

    // Ground lobby podium with glass front and entrance canopy.
    const podium = new THREE.Mesh(new THREE.BoxGeometry(PLATE.width + 2.4, 4.2, PLATE.depth + 2.6), materials.concreteDark);
    podium.position.set(0, 2.1, -1.3);
    podium.castShadow = true;
    podium.receiveShadow = true;
    const lobbyGlass = new THREE.Mesh(new THREE.BoxGeometry(PLATE.width - 4, 2.6, 0.12), materials.lobby);
    lobbyGlass.position.set(0, 2.1, PLATE.depth / 2 + 0.01);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(9, 0.22, 3.4), materials.canopy);
    canopy.position.set(0, 4.1, PLATE.depth / 2 + 2.1);
    canopy.castShadow = true;
    building.add(podium, lobbyGlass, canopy);
    [-3.8, 3.8].forEach((x) => {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4, 8), materials.canopy);
      column.position.set(x, 2, PLATE.depth / 2 + 3.4);
      column.castShadow = true;
      building.add(column);
    });

    // Elevator/stair core rising behind the corridor slab.
    const coreHeight = topY + 1.4;
    const core = new THREE.Mesh(new THREE.BoxGeometry(PLATE.coreWidth, coreHeight, PLATE.coreDepth), materials.concrete);
    core.position.set(0, coreHeight / 2, PLATE.coreCenterZ);
    core.castShadow = true;
    core.receiveShadow = true;
    const coreTrim = new THREE.Mesh(new THREE.BoxGeometry(PLATE.coreWidth + 0.3, coreHeight, 0.18), materials.concreteDark);
    coreTrim.position.set(0, coreHeight / 2, PLATE.coreCenterZ - PLATE.coreDepth / 2 - 0.05);
    building.add(core, coreTrim);

    plan.floors.forEach((floor, floorIndex) => {
      const floorGroup = new THREE.Group();
      floorGroup.name = `floor-${floor.floorNumber}`;
      floorGroups.set(floor.floorNumber, floorGroup);
      const y = floorY(floor.floorNumber, plan.minFloor);
      floorGroup.position.y = exploded ? (explodedFloorY(floor.floorNumber, plan.minFloor) - y) : 0;
      floorTargetsRef.current.set(floor.floorNumber, floorGroup.position.y);

      // Structural slab + spandrel edge band.
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(PLATE.width + 0.9, PLATE.slabThickness, PLATE.depth + 0.5),
        materials.concrete,
      );
      slab.position.set(0, y - PLATE.slabThickness / 2, 0);
      slab.castShadow = true;
      slab.receiveShadow = true;
      const band = new THREE.Mesh(new THREE.BoxGeometry(PLATE.width + 0.9, 0.34, 0.16), materials.spandrel);
      band.position.set(0, y + 0.17, PLATE.depth / 2 + 0.28);
      floorGroup.add(slab, band);

      // Open-air corridor: walkway + glass railing across the back.
      const walkSlab = new THREE.Mesh(
        new THREE.BoxGeometry(PLATE.width - 1.2, 0.1, PLATE.corridorDepth - 0.2),
        materials.concreteDark,
      );
      walkSlab.position.set(0, y + 0.05, PLATE.corridorCenterZ);
      walkSlab.receiveShadow = true;
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(PLATE.width - 1.2, 1.0, 0.05),
        materials.rail,
      );
      rail.position.set(0, y + 0.55, PLATE.corridorCenterZ - PLATE.corridorDepth / 2 + 0.25);
      const handrail = new THREE.Mesh(new THREE.BoxGeometry(PLATE.width - 1.2, 0.07, 0.11), materials.mullion);
      handrail.position.set(0, y + 1.08, PLATE.corridorCenterZ - PLATE.corridorDepth / 2 + 0.25);
      floorGroup.add(walkSlab, rail, handrail);

      floor.slots.forEach((slot) => {
        const transform = unitTransform(
          slot.unit ?? { id: `slot-${floor.floorNumber}-${slot.slotIndex}`, publicLabel: "", unitTypeName: "", floorNumber: floor.floorNumber },
          slot.slotIndex,
          floor.slots.length,
          plan.minFloor,
          y,
        );
        const [x, unitY, z] = transform.position;

        if (!slot.unit) {
          // Neutral architectural massing — occupancy for this slot is not public.
          const massing = new THREE.Mesh(
            new THREE.BoxGeometry(transform.width + 0.12, PLATE.unitHeight + 0.12, PLATE.unitDepth + 0.35),
            createMassingMaterial(),
          );
          massing.position.set(x, unitY, z - 0.1);
          massing.castShadow = true;
          massing.receiveShadow = true;
          floorGroup.add(massing);
          return;
        }

        const material = createUnitMaterial(slot.unit.status);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(transform.width, PLATE.unitHeight, PLATE.unitDepth), material);
        mesh.position.set(x, unitY, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.unit = slot.unit;
        floorGroup.add(mesh);
        interactive.push(mesh);
        records.set(slot.unit.id, {
          unit: slot.unit,
          mesh,
          floorNumber: floor.floorNumber,
          phase: ((floorIndex + slot.slotIndex) * 1.7) % (Math.PI * 2),
          selected: false,
          dimmed: false,
          hovered: false,
        });

        // Window assembly on the front face: glass + mullion cross.
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(transform.width * 0.66, 1.35), materials.glass);
        glass.position.set(x, unitY + 0.18, z + PLATE.unitDepth / 2 + 0.015);
        const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.35, 0.05), materials.mullion);
        mullionV.position.set(x, unitY + 0.18, z + PLATE.unitDepth / 2 + 0.04);
        const mullionH = new THREE.Mesh(new THREE.BoxGeometry(transform.width * 0.66, 0.06, 0.05), materials.mullion);
        mullionH.position.set(x, unitY + 0.18, z + PLATE.unitDepth / 2 + 0.04);
        floorGroup.add(glass, mullionV, mullionH);

        // Balcony slab with glass rails on the front.
        const balconyWidth = transform.width * 0.86;
        const balconySlab = new THREE.Mesh(
          new THREE.BoxGeometry(balconyWidth, 0.14, 1.25),
          materials.concreteDark,
        );
        balconySlab.position.set(x, y + 0.07, z + PLATE.unitDepth / 2 + 0.62);
        balconySlab.castShadow = true;
        balconySlab.receiveShadow = true;
        const balconyRail = new THREE.Mesh(new THREE.BoxGeometry(balconyWidth - 0.08, 1.0, 0.04), materials.rail);
        balconyRail.position.set(x, y + 0.64, z + PLATE.unitDepth / 2 + 1.22);
        const balconyRailSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, 1.2), materials.rail);
        balconyRailSide.position.set(x - balconyWidth / 2 + 0.06, y + 0.64, z + PLATE.unitDepth / 2 + 0.64);
        const balconyRailSide2 = balconyRailSide.clone();
        balconyRailSide2.position.x = x + balconyWidth / 2 - 0.06;
        floorGroup.add(balconySlab, balconyRail, balconyRailSide, balconyRailSide2);

        // Entry door facing the corridor.
        const door = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.05), materials.mullion);
        door.position.set(x, y + 1.03, z - PLATE.unitDepth / 2 - 0.015);
        door.rotation.y = Math.PI;
        floorGroup.add(door);
      });

      building.add(floorGroup);
    });

    // Roof: parapet, mechanical penthouse, utility boxes.
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(PLATE.width + 0.9, 0.3, PLATE.depth + 0.5), materials.concreteDark);
    roofSlab.position.set(0, topY + 0.15, 0);
    roofSlab.castShadow = true;
    const parapetFront = new THREE.Mesh(new THREE.BoxGeometry(PLATE.width + 0.9, 0.55, 0.14), materials.concrete);
    parapetFront.position.set(0, topY + 0.55, PLATE.depth / 2 + 0.3);
    const parapetBack = parapetFront.clone();
    parapetBack.position.z = -PLATE.depth / 2 - 0.3;
    const penthouse = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.4, 4.4), materials.concrete);
    penthouse.position.set(-3, topY + 1.5, -1.2);
    penthouse.castShadow = true;
    const utilities = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 1.1), materials.mullion);
    utilities.position.set(5.5, topY + 0.65, -2.4);
    utilities.castShadow = true;
    building.add(roofSlab, parapetFront, parapetBack, penthouse, utilities);

    ctx.scene.add(building);
    recordsRef.current = records;
    floorGroupsRef.current = floorGroups;
    interactiveRef.current = interactive;
    ctx.controls.minDistance = 8;
    ctx.controls.maxDistance = 70;
    const initialView = exploded ? explodedView(floorCount) : defaultView(floorCount);
    ctx.rig.snapTo(initialView.position, initialView.target);

    return () => {
      ctx.scene.remove(building);
      ctx.disposeSubtree(building);
      materials.dispose();
      recordsRef.current = new Map();
      floorGroupsRef.current = new Map();
      interactiveRef.current = [];
    };
    // `plan` identity is derived from planKey; exploded affects only initial group offsets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, plan, prefersDark]);

  // ---- Pointer interaction: hover tooltip + click-to-select with drag threshold.
  useEffect(() => {
    if (!ctx || plan.floors.length === 0) return;
    const dom = ctx.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredId: string | null = null;
    let pressedAt: { x: number; y: number } | null = null;

    const hit = (event: PointerEvent) => {
      const bounds = dom.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, ctx.camera);
      return raycaster.intersectObjects(interactiveRef.current, false)[0]?.object as
        | THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
        | undefined;
    };
    const setHovered = (id: string | null) => {
      if (hoveredId === id) return;
      const previous = hoveredId ? recordsRef.current.get(hoveredId) : undefined;
      if (previous) previous.hovered = false;
      const next = id ? recordsRef.current.get(id) : undefined;
      if (next) next.hovered = true;
      hoveredId = id;
      dom.style.cursor = id ? "pointer" : "grab";
    };
    const onMove = (event: PointerEvent) => {
      const target = hit(event);
      const unit = target?.userData.unit as BuildingUnit3D | undefined;
      setHovered(unit?.id ?? null);
      if (unit) {
        const bounds = dom.getBoundingClientRect();
        const details = [unit.unitTypeName, `${unit.floorNumber}F`, (unit.status ?? "AVAILABLE").replaceAll("_", " ").toLowerCase()]
          .filter(Boolean)
          .join(" · ");
        setTooltip({ x: event.clientX - bounds.left + 14, y: event.clientY - bounds.top + 14, text: `${unit.publicLabel} · ${details}` });
      } else {
        setTooltip(null);
      }
    };
    const onDown = (event: PointerEvent) => {
      pressedAt = { x: event.clientX, y: event.clientY };
    };
    const onUp = (event: PointerEvent) => {
      if (!pressedAt || Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > 5) return;
      const unit = hit(event)?.userData.unit as BuildingUnit3D | undefined;
      if (unit) {
        const record = recordsRef.current.get(unit.id);
        if (record) {
          const view = unitView({ position: [record.mesh.position.x, record.mesh.position.y, record.mesh.position.z], width: 0, depth: 0, height: 0 });
          ctx.rig.flyTo(view.position, view.target);
        }
        selectRef.current?.(unit);
      }
    };
    const onLeave = () => {
      setHovered(null);
      setTooltip(null);
    };
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointerup", onUp);
    dom.addEventListener("pointerleave", onLeave);
    return () => {
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointerleave", onLeave);
    };
  }, [ctx, plan]);

  // ---- Selection: emissive lift + camera fly-to (also covers parent-driven selection).
  useEffect(() => {
    recordsRef.current.forEach((record, id) => {
      record.selected = id === selectedId;
    });
    if (!ctx || !selectedId) return;
    const record = recordsRef.current.get(selectedId);
    if (record) {
      const view = unitView({ position: [record.mesh.position.x, record.mesh.position.y, record.mesh.position.z], width: 0, depth: 0, height: 0 });
      ctx.rig.flyTo(view.position, view.target);
    }
  }, [ctx, selectedId, plan]);

  // ---- Filter dimming in place.
  useEffect(() => {
    recordsRef.current.forEach((record) => {
      const matches = !filters || unitMatchesFilters(record.unit, filters);
      record.dimmed = !matches;
      record.mesh.material.transparent = !matches;
      record.mesh.material.opacity = matches ? 1 : 0.12;
      record.mesh.material.depthWrite = matches;
    });
  }, [filters, plan]);

  // ---- Exploded floors: animate group offsets + pull the camera back.
  useEffect(() => {
    floorGroupsRef.current.forEach((group, floorNumber) => {
      const offset = exploded ? explodedFloorY(floorNumber, plan.minFloor) - floorY(floorNumber, plan.minFloor) : 0;
      floorTargetsRef.current.set(floorNumber, offset);
    });
    if (!ctx || plan.floors.length === 0 || prefersReducedMotion()) return;
    const view = exploded ? explodedView(plan.floors.length) : defaultView(plan.floors.length);
    ctx.rig.flyTo(view.position, view.target, 900);
  }, [exploded, ctx, plan]);

  // ---- Per-frame: floor offsets easing + availability pulse.
  useEffect(() => {
    if (!ctx) return;
    return ctx.onFrame((dt, elapsed) => {
      floorGroupsRef.current.forEach((group, floorNumber) => {
        const target = floorTargetsRef.current.get(floorNumber) ?? 0;
        group.position.y += (target - group.position.y) * Math.min(1, dt * 6);
      });
      const reduced = prefersReducedMotion();
      recordsRef.current.forEach((record) => {
        if (record.dimmed) return;
        const available = (record.unit.status ?? "AVAILABLE") === "AVAILABLE";
        if (record.selected) record.mesh.material.emissiveIntensity = 0.5;
        else if (record.hovered) record.mesh.material.emissiveIntensity = 0.32;
        else if (available && !reduced)
          record.mesh.material.emissiveIntensity = 0.12 + 0.07 * Math.sin(elapsed * 1.7 + record.phase);
        else record.mesh.material.emissiveIntensity = 0.05;
      });
    });
  }, [ctx]);

  // ---- Keyboard traversal: arrows move between units, Enter/Space selects.
  const keyboardOrder = useMemo(() => sortUnitsForKeyboard(units), [units]);
  const onHostKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (keyboardOrder.length === 0) return;
    const currentIndex = selectedId ? keyboardOrder.findIndex((unit) => unit.id === selectedId) : -1;
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % keyboardOrder.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex <= 0 ? keyboardOrder.length : currentIndex) - 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? 1 : -1;
      const currentFloor = keyboardOrder[currentIndex]?.floorNumber ?? keyboardOrder[0]!.floorNumber - direction;
      const candidates = keyboardOrder.filter((unit) => (direction > 0 ? unit.floorNumber > currentFloor : unit.floorNumber < currentFloor));
      const candidate = direction > 0 ? candidates[0] : candidates.at(-1);
      if (!candidate) return;
      nextIndex = keyboardOrder.indexOf(candidate);
    } else if (event.key === "Enter" || event.key === " ") {
      const unit = currentIndex >= 0 ? keyboardOrder[currentIndex] : keyboardOrder[0]!;
      if (unit) {
        event.preventDefault();
        selectRef.current?.(unit);
      }
      return;
    } else return;
    event.preventDefault();
    const unit = keyboardOrder[nextIndex];
    if (unit) selectRef.current?.(unit);
  };

  const legendStatuses = useMemo(() => {
    const present = new Set(units.map((unit) => unit.status ?? "AVAILABLE"));
    return Object.keys(STATUS_COLORS).filter((status) => present.has(status));
  }, [units]);

  return (
    <div ref={viewerRef} tabIndex={0} data-hotkey-scope="viewer" onKeyDown={handleViewerKeyDown} onPointerDown={(event) => { if (event.target instanceof HTMLCanvasElement) viewerRef.current?.focus({ preventScroll: true }); }} className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
      <div
        ref={hostRef}
        tabIndex={0}
        onKeyDown={onHostKeyDown}
        className="w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        style={{ height }}
      />
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-neutral-700 shadow-sm backdrop-blur">
        Drag: rotate · Wheel/pinch: zoom · Right-drag: pan · Click a unit for details
      </div>
      <div className="absolute right-3 top-3 flex gap-2">
        <button
          type="button"
          aria-pressed={exploded}
          onClick={() => setExploded((value) => !value)}
          className={exploded ? "rounded-md bg-emerald-800 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm" : "rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur hover:bg-white"}
        >
          {exploded ? "Stack floors" : "Exploded view"}
        </button>
        <button
          type="button"
          onClick={() => {
            setExploded(false);
            if (ctx && plan.floors.length > 0) {
              const view = defaultView(plan.floors.length);
              ctx.rig.flyTo(view.position, view.target, 800);
            }
          }}
          className="rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur hover:bg-white"
        >
          Reset view
        </button>
      </div>
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-64 rounded-md bg-neutral-950 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
      {showLegend && legendStatuses.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-lg bg-white/90 p-2 text-[11px] shadow-sm">
          {legendStatuses.map((status) => (
            <span key={status} className="flex items-center gap-1">
              <i
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: `#${STATUS_COLORS[status]!.toString(16).padStart(6, "0")}` }}
              />
              {status.toLowerCase().replaceAll("_", " ")}
            </span>
          ))}
          {layout && <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-neutral-300" />not listed</span>}
        </div>
      )}
    </div>
  );
}
