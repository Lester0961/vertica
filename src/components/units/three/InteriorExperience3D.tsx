"use client";

/* eslint-disable react-hooks/immutability -- Loaded Three.js scenes and camera controls are intentionally imperative. */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import Image from "next/image";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { UnitInterior3D, type InteriorUnitInput } from "@/components/units/UnitInterior3D";
import { SceneBoundary } from "@/components/units/three/SceneBoundary";

type ViewerMode = "orbit" | "walk";
type Presentation = "listed" | "staged";
type ShowcaseViewpoint = "overview" | "living" | "kitchen" | "bedrooms";
type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;
type QualityTier = "high" | "balanced" | "low";

const LOCAL_ENVIRONMENT = "/models/vertica/v2/environment/evening-museum-courtyard-1k.hdr";

function detectQualityTier(): QualityTier {
  if (typeof navigator === "undefined") return "balanced";
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (hardwareConcurrency <= 4 || deviceMemory <= 4 || window.innerWidth < 720) return "low";
  if (hardwareConcurrency >= 8 && deviceMemory >= 8 && window.innerWidth >= 1200) return "high";
  return "balanced";
}

function configureSurfaceTexture(texture: THREE.Texture, repeat: [number, number], color = false) {
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
}

const LOCAL_INTERIORS: Record<string, string> = {
  STUDIO: "/models/vertica/v1/interiors/studio.glb",
  "1BR": "/models/vertica/v1/interiors/one-bedroom.glb",
  "2BR": "/models/vertica/v1/interiors/two-bedroom.glb",
};

const PLAN_DIMENSIONS: Record<string, { width: number; depth: number }> = {
  STUDIO: { width: 6.4, depth: 4.6 },
  "1BR": { width: 7.8, depth: 5.6 },
  "2BR": { width: 11, depth: 6.4 },
};

function modelFor(unit: InteriorUnitInput): string {
  const code = unit.unitTypeCode ?? (unit.bedrooms <= 0 ? "STUDIO" : unit.bedrooms === 1 ? "1BR" : "2BR");
  return LOCAL_INTERIORS[code] ?? LOCAL_INTERIORS.STUDIO!;
}

function dimensionsFor(unit: InteriorUnitInput) {
  const code = unit.unitTypeCode ?? (unit.bedrooms <= 0 ? "STUDIO" : unit.bedrooms === 1 ? "1BR" : "2BR");
  return PLAN_DIMENSIONS[code] ?? PLAN_DIMENSIONS.STUDIO!;
}

function InteriorModel({
  modelUrl,
  furnishing,
  presentation,
  onReady,
  quality,
}: {
  modelUrl: string;
  furnishing?: string | null;
  presentation: Presentation;
  onReady(): void;
  quality: QualityTier;
}) {
  const source = useGLTF(modelUrl).scene;
  const model = useMemo(() => source.clone(true), [source]);
  const invalidate = useThree((state) => state.invalidate);
  const textures = useTexture({
    oakColor: "/models/vertica/v2/materials/oak/oak-color.jpg",
    oakNormal: "/models/vertica/v2/materials/oak/oak-normal.jpg",
    oakRoughness: "/models/vertica/v2/materials/oak/oak-roughness.jpg",
    linenColor: "/models/vertica/v2/materials/linen/linen-color.jpg",
    linenNormal: "/models/vertica/v2/materials/linen/linen-normal.jpg",
    linenRoughness: "/models/vertica/v2/materials/linen/linen-roughness.jpg",
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
    configureSurfaceTexture(textures.oakColor, [2, 2], true);
    configureSurfaceTexture(textures.oakNormal, [2, 2]);
    configureSurfaceTexture(textures.oakRoughness, [2, 2]);
    configureSurfaceTexture(textures.linenColor, [5, 5], true);
    configureSurfaceTexture(textures.linenNormal, [5, 5]);
    configureSurfaceTexture(textures.linenRoughness, [5, 5]);
    configureSurfaceTexture(textures.plasterColor, [2, 2], true);
    configureSurfaceTexture(textures.plasterNormal, [2, 2]);
    configureSurfaceTexture(textures.plasterRoughness, [2, 2]);
    configureSurfaceTexture(textures.concreteColor, [2, 2], true);
    configureSurfaceTexture(textures.concreteNormal, [2, 2]);
    configureSurfaceTexture(textures.concreteRoughness, [2, 2]);
    configureSurfaceTexture(textures.paversColor, [3, 2], true);
    configureSurfaceTexture(textures.paversNormal, [3, 2]);
    configureSurfaceTexture(textures.paversRoughness, [3, 2]);

    const oak = new THREE.MeshStandardMaterial({ name: "Runtime oak", map: textures.oakColor, normalMap: textures.oakNormal, normalScale: new THREE.Vector2(0.32, 0.32), roughnessMap: textures.oakRoughness, roughness: 0.64, color: 0xffffff });
    const darkOak = new THREE.MeshStandardMaterial({ name: "Runtime smoked oak", map: textures.oakColor, normalMap: textures.oakNormal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: textures.oakRoughness, roughness: 0.62, color: 0x5c4332 });
    const linen = new THREE.MeshStandardMaterial({ name: "Runtime linen", map: textures.linenColor, normalMap: textures.linenNormal, normalScale: new THREE.Vector2(0.4, 0.4), roughnessMap: textures.linenRoughness, roughness: 0.94, color: 0xd7d0c2 });
    const plaster = new THREE.MeshStandardMaterial({ name: "Runtime plaster", map: textures.plasterColor, normalMap: textures.plasterNormal, normalScale: new THREE.Vector2(0.2, 0.2), roughnessMap: textures.plasterRoughness, roughness: 0.9, color: 0xf0ebe2 });
    const concrete = new THREE.MeshStandardMaterial({ name: "Runtime stone", map: textures.concreteColor, normalMap: textures.concreteNormal, normalScale: new THREE.Vector2(0.28, 0.28), roughnessMap: textures.concreteRoughness, roughness: 0.62, color: 0xcac7bf });
    const pavers = new THREE.MeshStandardMaterial({ name: "Runtime tile", map: textures.paversColor, normalMap: textures.paversNormal, normalScale: new THREE.Vector2(0.34, 0.34), roughnessMap: textures.paversRoughness, roughness: 0.76 });
    const glass = quality === "high"
      ? new THREE.MeshPhysicalMaterial({ name: "Runtime room glass", color: 0x9ab7bd, roughness: 0.12, transmission: 0.34, thickness: 0.08, transparent: true, opacity: 0.62, depthWrite: false })
      : new THREE.MeshStandardMaterial({ name: "Runtime room glass", color: 0x91adb3, roughness: 0.2, transparent: true, opacity: quality === "low" ? 0.5 : 0.58, depthWrite: false });
    return { oak, darkOak, linen, plaster, concrete, pavers, glass };
  }, [quality, textures]);

  useEffect(() => {
    const listedSemi = furnishing !== "UNFURNISHED";
    const listedFull = furnishing === "FURNISHED";
    model.traverse((object) => {
      if (object.name === "FURN_BASE") object.visible = true;
      if (object.name === "FURN_SEMI") object.visible = presentation === "staged" || listedSemi;
      if (object.name === "FURN_FULL") object.visible = presentation === "staged" || listedFull;
      if (object.name === "COLLISION") object.visible = false;
      if (object instanceof THREE.Mesh && object.name !== "COLLISION") {
        object.castShadow = true;
        object.receiveShadow = true;
        const sourceMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
        if (/Smoked oak/i.test(sourceMaterial.name)) object.material = surfaceMaterials.darkOak;
        else if (/Oak/i.test(sourceMaterial.name)) object.material = surfaceMaterials.oak;
        else if (/Fabric|Linen/i.test(sourceMaterial.name)) object.material = surfaceMaterials.linen;
        else if (/Warm wall/i.test(sourceMaterial.name)) object.material = surfaceMaterials.plaster;
        else if (/Stone tile/i.test(sourceMaterial.name)) object.material = surfaceMaterials.pavers;
        else if (/Stone|Quartz|Concrete limestone/i.test(sourceMaterial.name)) object.material = surfaceMaterials.concrete;
        else if (/Facade glass/i.test(sourceMaterial.name)) object.material = surfaceMaterials.glass;
      }
    });
    onReady();
    invalidate();
  }, [furnishing, invalidate, model, onReady, presentation, surfaceMaterials]);

  return <primitive object={model} />;
}

function CameraMode({
  mode,
  dimensions,
  controlsRef,
  viewpoint,
}: {
  mode: ViewerMode;
  dimensions: { width: number; depth: number };
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  viewpoint: ShowcaseViewpoint;
}) {
  const { camera, gl } = useThree();
  const invalidate = useThree((state) => state.invalidate);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const keysRef = useRef(new Set<string>());
  const lookRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (mode === "orbit") {
      const poses: Record<ShowcaseViewpoint, { position: [number, number, number]; target: [number, number, number] }> = {
        overview: {
          position: [dimensions.width * 0.62, dimensions.depth * 0.72 + 2.5, dimensions.depth * 1.15],
          target: [0, 0.65, 0],
        },
        living: {
          position: [-dimensions.width * 0.2, 3.2, dimensions.depth * 0.92],
          target: [-dimensions.width * 0.16, 0.8, 0.55],
        },
        kitchen: {
          position: [-dimensions.width * 0.6, 2.8, dimensions.depth * 0.2],
          target: [-dimensions.width * 0.3, 0.85, -dimensions.depth * 0.28],
        },
        bedrooms: {
          position: [dimensions.width * 0.58, 3.1, dimensions.depth * 0.58],
          target: [dimensions.width * 0.28, 0.8, -0.15],
        },
      };
      const pose = poses[viewpoint];
      camera.position.set(...pose.position);
      camera.lookAt(...pose.target);
      if (controls) {
        controls.enabled = true;
        controls.target.set(...pose.target);
        controls.update();
      }
      invalidate();
      return;
    }

    if (controls) controls.enabled = false;
    camera.position.set(0, 1.6, Math.min(0.8, dimensions.depth * 0.15));
    camera.lookAt(0, 1.6, dimensions.depth / 2);
    camera.rotation.order = "YXZ";
    yawRef.current = camera.rotation.y;
    pitchRef.current = camera.rotation.x;
    const dom = gl.domElement;
    dom.tabIndex = 0;
    dom.focus({ preventScroll: true });
    const activeKeys = keysRef.current;

    const onKeyDown = (event: KeyboardEvent) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
        activeKeys.add(event.code);
        invalidate();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      activeKeys.delete(event.code);
      invalidate();
    };
    const onPointerDown = (event: PointerEvent) => {
      lookRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      dom.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      const look = lookRef.current;
      if (!look || look.pointerId !== event.pointerId) return;
      yawRef.current -= (event.clientX - look.x) * 0.0045;
      pitchRef.current = Math.max(-1.15, Math.min(1.15, pitchRef.current - (event.clientY - look.y) * 0.0045));
      look.x = event.clientX;
      look.y = event.clientY;
      invalidate();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (lookRef.current?.pointerId === event.pointerId) lookRef.current = null;
    };

    dom.addEventListener("keydown", onKeyDown);
    dom.addEventListener("keyup", onKeyUp);
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("pointercancel", onPointerUp);
    return () => {
      dom.removeEventListener("keydown", onKeyDown);
      dom.removeEventListener("keyup", onKeyUp);
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("pointercancel", onPointerUp);
      activeKeys.clear();
      lookRef.current = null;
    };
  }, [camera, controlsRef, dimensions.depth, dimensions.width, gl, invalidate, mode, viewpoint]);

  useFrame((_state, delta) => {
    if (mode !== "walk") return;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitchRef.current, yawRef.current, 0);
    let forward = 0;
    let strafe = 0;
    const keys = keysRef.current;
    if (keys.has("KeyW") || keys.has("ArrowUp")) forward += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) forward -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) strafe += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) strafe -= 1;
    if (!forward && !strafe) return;

    const length = Math.max(1, Math.hypot(forward, strafe));
    forward /= length;
    strafe /= length;
    const speed = 2.1 * delta;
    const yaw = yawRef.current;
    const nextX = camera.position.x + (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed;
    const nextZ = camera.position.z + (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed;
    const margin = 0.35;
    camera.position.x = THREE.MathUtils.clamp(nextX, -dimensions.width / 2 + margin, dimensions.width / 2 - margin);
    camera.position.z = THREE.MathUtils.clamp(nextZ, -dimensions.depth / 2 + margin, dimensions.depth / 2 - margin);
    camera.position.y = 1.6;
    invalidate();
  });

  return null;
}

export function InteriorExperience3D({ unit, height = 430 }: { unit: InteriorUnitInput; height?: number }) {
  const localModelUrl = modelFor(unit);
  const [modelUrl, setModelUrl] = useState(localModelUrl);
  const [posterUrl, setPosterUrl] = useState("/images/vertica/vertica-residence.webp");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<ViewerMode>("orbit");
  const showcase = unit.publicLabel === "Unit 204";
  const [presentation, setPresentation] = useState<Presentation>(showcase ? "staged" : "listed");
  const [viewpoint, setViewpoint] = useState<ShowcaseViewpoint>("overview");
  const [quality] = useState<QualityTier>(detectQualityTier);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const dimensions = dimensionsFor(unit);
  const handleReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/public/units/${encodeURIComponent(unit.publicLabel)}/visuals`, { cache: "no-store" })
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
  }, [unit.publicLabel]);

  const fallback = <UnitInterior3D unit={unit} height={height} />;

  return (
    <SceneBoundary key={modelUrl} fallback={fallback}>
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950" style={{ height }}>
        {!ready && <div className="absolute inset-0">
          <Image loading="eager" src={posterUrl} alt="Vertica residence artist visualization" fill sizes="(max-width: 1024px) 100vw, 896px" className="object-cover opacity-70" />
          <div className="absolute inset-0 bg-neutral-950/25" />
          <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/85 to-transparent px-5 py-4 text-sm text-white">
            Loading room model…
          </p>
        </div>}
        <Canvas
          shadows={quality !== "low"}
          frameloop="demand"
          dpr={quality === "high" ? 1.5 : quality === "balanced" ? 1.25 : 1}
          camera={{ position: [dimensions.width * 0.78, dimensions.depth * 1.05 + 2.8, dimensions.depth * 1.55], fov: 42, near: 0.08, far: 120 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          aria-label={`Interactive 3D room model of ${unit.publicLabel}.`}
        >
          <color attach="background" args={["#343a34"]} />
          <ambientLight intensity={0.95} />
          <hemisphereLight args={[0xfff7e8, 0x3b423b, 2.2]} />
          <directionalLight position={[8, 14, 10]} intensity={3.1} castShadow={quality !== "low"} shadow-mapSize={[quality === "high" ? 1024 : 512, quality === "high" ? 1024 : 512]} />
          <pointLight position={[-2, 2.4, 0]} color={0xffd6a0} intensity={5.5} distance={15} decay={2} />
          <Suspense fallback={null}>
            {quality !== "low" && <Environment files={LOCAL_ENVIRONMENT} environmentIntensity={0.58} />}
            <InteriorModel modelUrl={modelUrl} furnishing={unit.furnishing} presentation={presentation} onReady={handleReady} quality={quality} />
            {quality === "high" && <ContactShadows position={[0, -0.08, 0]} opacity={0.34} scale={Math.max(dimensions.width, dimensions.depth) * 1.5} blur={2.4} far={20} frames={1} />}
          </Suspense>
          <OrbitControls ref={controlsRef} makeDefault enabled={mode === "orbit"} enableDamping dampingFactor={0.08} minDistance={2.8} maxDistance={36} />
          <CameraMode mode={mode} dimensions={dimensions} controlsRef={controlsRef} viewpoint={viewpoint} />
        </Canvas>

        <div className="pointer-events-none absolute left-3 top-3 max-w-[55%] rounded-lg border border-white/15 bg-neutral-950/80 px-3 py-2 text-xs text-white shadow-sm backdrop-blur">
          <strong>{unit.publicLabel}</strong><br />
          {showcase ? "Showcase 2BR artist visualization" : `${unit.unitTypeName} prototype`}
        </div>
        <div className="absolute right-3 top-3 flex overflow-hidden rounded-lg shadow-sm">
          <button type="button" aria-pressed={mode === "orbit"} onClick={() => setMode("orbit")} className={mode === "orbit" ? "bg-emerald-800 px-3 py-2 text-xs font-semibold text-white" : "bg-neutral-950/75 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-neutral-900"}>Dollhouse</button>
          <button type="button" aria-pressed={mode === "walk"} onClick={() => setMode("walk")} className={mode === "walk" ? "bg-emerald-800 px-3 py-2 text-xs font-semibold text-white" : "bg-neutral-950/75 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-neutral-900"}>Walkthrough</button>
        </div>
        {showcase && mode === "orbit" && (
          <div className="absolute bottom-3 left-3 flex overflow-hidden rounded-lg border border-white/15 bg-neutral-950/75 shadow-sm backdrop-blur">
            {(["overview", "living", "kitchen", "bedrooms"] as ShowcaseViewpoint[]).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={viewpoint === item}
                onClick={() => setViewpoint(item)}
                className={viewpoint === item ? "bg-white px-3 py-2 text-xs font-semibold capitalize text-neutral-950" : "px-3 py-2 text-xs font-semibold capitalize text-white hover:bg-white/10"}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {showcase && (
          <div className="absolute bottom-3 right-3 flex overflow-hidden rounded-lg shadow-sm">
            <button type="button" aria-pressed={presentation === "listed"} onClick={() => setPresentation("listed")} className={presentation === "listed" ? "bg-white px-3 py-2 text-xs font-semibold text-neutral-950" : "bg-neutral-950/75 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-neutral-900"}>As listed</button>
            <button type="button" aria-pressed={presentation === "staged"} onClick={() => setPresentation("staged")} className={presentation === "staged" ? "bg-white px-3 py-2 text-xs font-semibold text-neutral-950" : "bg-neutral-950/75 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-neutral-900"}>Staged</button>
          </div>
        )}
        {(!showcase || mode === "walk") && (
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/15 bg-neutral-950/80 px-3 py-2 text-xs text-white shadow-sm backdrop-blur">
            {mode === "orbit" ? "Drag to orbit. Scroll or pinch to zoom." : "Use W A S D or arrow keys. Drag to look around."}
          </p>
        )}
      </div>
    </SceneBoundary>
  );
}
