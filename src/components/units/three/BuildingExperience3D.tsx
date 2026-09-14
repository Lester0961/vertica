"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Bounds, ContactShadows, Environment, OrbitControls, useBounds, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Building3D, type Building3DProps } from "@/components/units/Building3D";
import { SceneBoundary } from "@/components/units/three/SceneBoundary";
import { prefersReducedMotion } from "@/components/units/three/cameraRig";
import { unitMatchesFilters, type BuildingUnit3D } from "@/components/units/three/buildingLayout";

const LOCAL_BUILDING_MODEL = "/models/vertica/v2/building/vertica-building.glb";
const LOCAL_BUILDING_POSTER = "/images/vertica/vertica-exterior.webp";
const LOCAL_ENVIRONMENT = "/models/vertica/v2/environment/evening-museum-courtyard-1k.hdr";

type QualityTier = "high" | "balanced" | "low";

function detectQualityTier(): QualityTier {
  if (typeof navigator === "undefined") return "balanced";
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (hardwareConcurrency <= 4 || deviceMemory <= 4 || window.innerWidth < 720) return "low";
  if (hardwareConcurrency >= 8 && deviceMemory >= 8 && window.innerWidth >= 1200) return "high";
  return "balanced";
}

function configureSurfaceTexture(texture: THREE.Texture, repeat: [number, number], color = false) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
}

function proxyName(unit: BuildingUnit3D): string | null {
  const number = unit.unitNumber ?? unit.publicLabel.match(/\d+/)?.[0];
  if (!number) return null;
  const bay = Number(number.slice(-2));
  if (!Number.isInteger(bay) || bay < 1 || bay > 99) return null;
  return `PICK_F${String(unit.floorNumber).padStart(2, "0")}_B${String(bay).padStart(2, "0")}`;
}

function unitFromObject(object: THREE.Object3D): BuildingUnit3D | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const unit = current.userData.unit as BuildingUnit3D | undefined;
    if (unit) return unit;
    current = current.parent;
  }
  return null;
}

function BuildingModel({
  modelUrl,
  units,
  selectedId,
  filters,
  exploded,
  resetToken,
  onSelect,
  onReady,
  quality,
}: {
  modelUrl: string;
  units: BuildingUnit3D[];
  selectedId?: string;
  filters?: Building3DProps["filters"];
  exploded: boolean;
  resetToken: number;
  onSelect?: (unit: BuildingUnit3D) => void;
  onReady(): void;
  quality: QualityTier;
}) {
  const source = useGLTF(modelUrl).scene;
  const model = useMemo(() => source.clone(true), [source]);
  const bounds = useBounds();
  const invalidate = useThree((state) => state.invalidate);
  const textureMaps = useTexture({
    plasterColor: "/models/vertica/v2/materials/plaster/plaster-color.jpg",
    plasterNormal: "/models/vertica/v2/materials/plaster/plaster-normal.jpg",
    plasterRoughness: "/models/vertica/v2/materials/plaster/plaster-roughness.jpg",
    concreteColor: "/models/vertica/v2/materials/concrete/concrete-color.jpg",
    concreteNormal: "/models/vertica/v2/materials/concrete/concrete-normal.jpg",
    concreteRoughness: "/models/vertica/v2/materials/concrete/concrete-roughness.jpg",
    paversColor: "/models/vertica/v2/materials/pavers/pavers-color.jpg",
    paversNormal: "/models/vertica/v2/materials/pavers/pavers-normal.jpg",
    paversRoughness: "/models/vertica/v2/materials/pavers/pavers-roughness.jpg",
  });
  const surfaceMaterials = useMemo(() => {
    configureSurfaceTexture(textureMaps.plasterColor, [3, 2], true);
    configureSurfaceTexture(textureMaps.plasterNormal, [3, 2]);
    configureSurfaceTexture(textureMaps.plasterRoughness, [3, 2]);
    configureSurfaceTexture(textureMaps.concreteColor, [4, 2], true);
    configureSurfaceTexture(textureMaps.concreteNormal, [4, 2]);
    configureSurfaceTexture(textureMaps.concreteRoughness, [4, 2]);
    configureSurfaceTexture(textureMaps.paversColor, [7, 5], true);
    configureSurfaceTexture(textureMaps.paversNormal, [7, 5]);
    configureSurfaceTexture(textureMaps.paversRoughness, [7, 5]);

    const plaster = new THREE.MeshStandardMaterial({
      name: "Runtime plaster",
      map: textureMaps.plasterColor,
      normalMap: textureMaps.plasterNormal,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughnessMap: textureMaps.plasterRoughness,
      roughness: 0.88,
      color: 0xe6e1d7,
    });
    const concrete = new THREE.MeshStandardMaterial({
      name: "Runtime brushed concrete",
      map: textureMaps.concreteColor,
      normalMap: textureMaps.concreteNormal,
      normalScale: new THREE.Vector2(0.34, 0.34),
      roughnessMap: textureMaps.concreteRoughness,
      roughness: 0.82,
      color: 0x777c76,
    });
    const pavers = new THREE.MeshStandardMaterial({
      name: "Runtime stone pavers",
      map: textureMaps.paversColor,
      normalMap: textureMaps.paversNormal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: textureMaps.paversRoughness,
      roughness: 0.78,
    });
    const glass = quality === "high"
      ? new THREE.MeshPhysicalMaterial({ name: "Runtime facade glass", color: 0x789aa2, roughness: 0.16, transmission: 0.28, thickness: 0.12, transparent: true, opacity: 0.68, depthWrite: false })
      : new THREE.MeshStandardMaterial({ name: "Runtime facade glass", color: 0x6f9298, roughness: 0.24, metalness: 0.12, transparent: true, opacity: quality === "low" ? 0.58 : 0.66, depthWrite: false });
    const warmWindows = new THREE.MeshStandardMaterial({
      name: "Runtime warm glazing",
      color: 0xadc0ba,
      roughness: 0.24,
      metalness: 0.08,
      emissive: 0xffbd70,
      emissiveIntensity: quality === "low" ? 0.2 : 0.46,
    });
    return { plaster, concrete, pavers, glass, warmWindows };
  }, [quality, textureMaps]);
  const unitByProxy = useMemo(() => {
    const entries = units.flatMap((unit) => {
      const name = proxyName(unit);
      return name ? [[name, unit] as const] : [];
    });
    return new Map(entries);
  }, [units]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = !object.name.startsWith("PICK_");
      object.receiveShadow = !object.name.startsWith("PICK_");
      const sourceMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
      if (sourceMaterial.name === "Concrete limestone") object.material = surfaceMaterials.plaster;
      if (sourceMaterial.name === "Concrete charcoal") object.material = surfaceMaterials.concrete;
      if (sourceMaterial.name === "Stone tile") object.material = surfaceMaterials.pavers;
      if (sourceMaterial.name === "Facade glass") object.material = surfaceMaterials.glass;
      if (sourceMaterial.name === "Warm interior glazing") object.material = surfaceMaterials.warmWindows;
      if (!object.name.startsWith("PICK_")) return;
      const unit = unitByProxy.get(object.name);
      object.userData.unit = unit;
      object.visible = !!unit;
      object.material = new THREE.MeshBasicMaterial({
        name: `Availability ${unit?.publicLabel ?? object.name}`,
        color: 0x49d486,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    });
    onReady();
    const timer = window.setTimeout(() => {
      bounds.refresh(model.getObjectByName("ARCH_BUILDING") ?? model).fit();
      invalidate();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bounds, invalidate, model, onReady, surfaceMaterials, unitByProxy]);

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.name.startsWith("PICK_")) return;
      const unit = object.userData.unit as BuildingUnit3D | undefined;
      const material = object.material as THREE.MeshBasicMaterial;
      if (!unit) return;
      const matches = !filters || unitMatchesFilters(unit, filters);
      material.opacity = !matches ? 0.015 : unit.id === selectedId ? 0.36 : unit.id === hoveredId ? 0.24 : 0.12;
    });
    invalidate();
  }, [filters, hoveredId, invalidate, model, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let target: THREE.Object3D | null = null;
    model.traverse((object) => {
      if ((object.userData.unit as BuildingUnit3D | undefined)?.id === selectedId) target = object;
    });
    if (target) bounds.refresh(target).fit();
  }, [bounds, model, selectedId]);

  useEffect(() => {
    if (resetToken === 0) return;
    bounds.refresh(model.getObjectByName("ARCH_BUILDING") ?? model).fit();
  }, [bounds, model, resetToken]);

  useFrame((_state, delta) => {
    let moving = false;
    model.children.forEach((object) => {
      if (!object.name.startsWith("ARCH_BUILDING")) return;
      object.children.forEach((floor) => {
        if (!floor.name.startsWith("FLOOR_")) return;
        const floorNumber = Number(floor.name.slice(-2));
        const target = exploded ? Math.max(0, floorNumber - 2) * 1.45 : 0;
        const difference = target - floor.position.y;
        if (Math.abs(difference) > 0.002) {
          floor.position.y += difference * Math.min(1, delta * 6);
          moving = true;
        } else {
          floor.position.y = target;
        }
      });
    });
    if (moving) invalidate();
  });

  useEffect(() => invalidate(), [exploded, invalidate, resetToken]);

  const handlePointer = (event: ThreeEvent<PointerEvent>, action: "hover" | "select") => {
    const unit = unitFromObject(event.object);
    if (!unit) return;
    event.stopPropagation();
    if (action === "hover") setHoveredId(unit.id);
    else onSelect?.(unit);
  };

  return (
    <primitive
      object={model}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => handlePointer(event, "hover")}
      onPointerOut={() => setHoveredId(null)}
      onClick={(event: ThreeEvent<MouseEvent>) => handlePointer(event as unknown as ThreeEvent<PointerEvent>, "select")}
    />
  );
}

export function BuildingExperience3D(props: Building3DProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [modelUrl, setModelUrl] = useState(LOCAL_BUILDING_MODEL);
  const [posterUrl, setPosterUrl] = useState(LOCAL_BUILDING_POSTER);
  const [ready, setReady] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [quality] = useState<QualityTier>(detectQualityTier);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/public/visuals/building", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        const model = json?.data?.manifest?.model;
        if (!active || !model?.glbUrl) return;
        setReady(false);
        setModelUrl(model.glbUrl);
        if (model.posterUrl) setPosterUrl(model.posterUrl);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const reducedMotion = prefersReducedMotion();
  const height = props.height ?? 520;
  const fallback = <Building3D {...props} />;
  const handleReady = useCallback(() => setReady(true), []);
  const handleViewerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLButtonElement) return;
    if (event.key.toLowerCase() === "e") { event.preventDefault(); setExploded((value) => !value); }
    else if (event.key.toLowerCase() === "r") { event.preventDefault(); setExploded(false); setResetToken((value) => value + 1); }
  };

  return (
    <SceneBoundary key={modelUrl} fallback={fallback}>
      <div ref={viewerRef} tabIndex={0} data-hotkey-scope="viewer" onKeyDown={handleViewerKeyDown} onPointerDown={(event) => { if (event.target instanceof HTMLCanvasElement) viewerRef.current?.focus({ preventScroll: true }); }} className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" style={{ height }}>
        {!ready && <div className="absolute inset-0">
          <Image loading="eager" src={posterUrl} alt="Vertica condominium exterior artist visualization" fill sizes="(max-width: 1024px) 100vw, 70vw" className="object-cover opacity-70" />
          <div className="absolute inset-0 bg-neutral-950/35" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/80 to-transparent px-5 py-4 text-sm text-white">
            Loading interactive building model…
          </div>
        </div>}
        <Canvas
          shadows={quality !== "low"}
          frameloop="demand"
          dpr={quality === "high" ? 1.5 : quality === "balanced" ? 1.25 : 1}
          camera={{ position: [24, 22, 34], fov: 38, near: 0.1, far: 250 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          aria-label="Interactive 3D condominium. Available residences have a subtle green highlight."
        >
          <color attach="background" args={["#182019"]} />
          <ambientLight intensity={0.8} />
          <hemisphereLight args={[0xf4f1e7, 0x273028, 2.1]} />
          <directionalLight position={[22, 34, 18]} intensity={3.4} castShadow={quality !== "low"} shadow-mapSize={[quality === "high" ? 1024 : 512, quality === "high" ? 1024 : 512]} />
          <Suspense fallback={null}>
            {quality !== "low" && <Environment files={LOCAL_ENVIRONMENT} environmentIntensity={0.72} />}
            <Bounds fit clip margin={1.12} maxDuration={0}>
              <BuildingModel
                modelUrl={modelUrl}
                units={props.units}
                selectedId={props.selectedId}
                filters={props.filters}
                exploded={exploded}
                resetToken={resetToken}
                onSelect={props.onSelect}
                onReady={handleReady}
                quality={quality}
              />
            </Bounds>
            {quality === "high" && <ContactShadows position={[0, -0.2, 0]} opacity={0.34} scale={80} blur={2.6} far={45} frames={1} />}
          </Suspense>
          <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={8} maxDistance={85} />
        </Canvas>
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-lg bg-white/90 px-3 py-2 text-xs text-neutral-700 shadow-sm backdrop-blur">
          Drag to rotate. Scroll or pinch to zoom. Select a highlighted residence. <span className="text-neutral-500">{quality} detail</span>
        </div>
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            aria-pressed={exploded}
            onClick={() => setExploded((value) => !value)}
            className={exploded ? "rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white" : "rounded-md border border-white/15 bg-neutral-950/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-neutral-950"}
          >
            {exploded ? "Stack floors" : "Separate floors"}
          </button>
          <button
            type="button"
            onClick={() => {
              setExploded(false);
              setResetToken((value) => value + 1);
            }}
            className="rounded-md border border-white/15 bg-neutral-950/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-neutral-950"
          >
            Reset view
          </button>
        </div>
        {reducedMotion && <span className="sr-only">Camera changes occur without animation because reduced motion is enabled.</span>}
      </div>
    </SceneBoundary>
  );
}

useGLTF.preload(LOCAL_BUILDING_MODEL);
