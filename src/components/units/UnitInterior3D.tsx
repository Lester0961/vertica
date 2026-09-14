"use client";

/* eslint-disable react-hooks/immutability -- Three.js scenes, cameras, and controls are intentionally imperative objects. */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/components/units/three/useThreeScene";
import { SCENE_ENV } from "@/components/units/three/materials";
import { buildInteriorScene, EYE_HEIGHT, type InteriorSceneResult } from "@/components/units/three/interiorRenderer";
import { getFloorPlan, hasBalconyFeature, orientationToDegrees } from "@/features/units/floorPlans";

export interface InteriorUnitInput {
  publicLabel: string;
  unitTypeName: string;
  unitTypeCode?: string | null;
  bedrooms: number;
  bathrooms?: number | null;
  areaSqm?: number | null;
  orientation?: string | null;
  furnishing?: string | null;
  features?: { code: string; valueBoolean?: boolean | null }[] | null;
}

type Mode = "orbit" | "walk";

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function UnitInterior3D({ unit, height = 380 }: { unit: InteriorUnitInput; height?: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("orbit");
  const [touchJoystick, setTouchJoystick] = useState(false);

  // Defer WebGL until the canvas scrolls into view (keeps /compare light).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const prefersDark = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
    [],
  );

  const ctx = useThreeScene(hostRef, {
    ariaLabel: `Interactive 3D layout of ${unit.publicLabel} (${unit.unitTypeName}). Drag to look around. Use the walkthrough toggle to explore in first person with WASD or the on-screen joystick.`,
    enabled: visible,
  });

  const unitKey = useMemo(
    () =>
      JSON.stringify([
        unit.unitTypeCode ?? "",
        unit.bedrooms,
        unit.furnishing ?? "",
        unit.orientation ?? "",
        hasBalconyFeature(unit.features),
      ]),
    [unit],
  );
  const plan = useMemo(() => getFloorPlan(unit.unitTypeCode, unit.bedrooms), [unit]);

  const interiorRef = useRef<InteriorSceneResult | null>(null);

  // Lights + backdrop (once per context).
  useEffect(() => {
    if (!ctx) return;
    const env = SCENE_ENV[prefersDark ? "dark" : "light"];
    ctx.scene.background = new THREE.Color(env.background);
    ctx.scene.fog = new THREE.Fog(env.fog, 40, 90);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x767f76, 2.6);
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.6);
    sun.position.set(6, 12, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.0005;
    const warm = new THREE.PointLight(0xffe8c4, 12, 18, 2);
    warm.position.set(0, 2.2, 0);
    const lights = new THREE.Group();
    lights.add(hemi, sun, warm);
    ctx.scene.add(lights);
    return () => {
      ctx.scene.remove(lights);
      ctx.disposeSubtree(lights);
      ctx.scene.background = null;
      ctx.scene.fog = null;
    };
  }, [ctx, prefersDark]);

  // Interior geometry (rebuilt when the unit identity changes).
  useEffect(() => {
    if (!ctx) return;
    const interior = buildInteriorScene(plan, {
      furnishing: unit.furnishing,
      orientationDeg: orientationToDegrees(unit.orientation),
      balcony: hasBalconyFeature(unit.features),
      prefersDark,
    });
    ctx.scene.add(interior.group);
    interiorRef.current = interior;
    ctx.controls.minDistance = 2.5;
    ctx.controls.maxDistance = 34;
    return () => {
      ctx.scene.remove(interior.group);
      ctx.disposeSubtree(interior.group);
      interiorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, unitKey, prefersDark]);

  // Mode switches: orbit overview ↔ first-person at eye height.
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  useEffect(() => {
    if (!ctx) return;
    const interior = interiorRef.current;
    if (!interior) return;
    if (mode === "orbit") {
      interior.setCeilingVisible(false);
      ctx.controls.enabled = true;
      ctx.rig.snapTo(
        { x: plan.overallW * 0.75, y: plan.overallD * 1.1 + 2.4, z: plan.overallD * 1.55 },
        { x: 0, y: 0.7, z: 0 },
      );
    } else {
      interior.setCeilingVisible(true);
      ctx.controls.enabled = false;
      const { spawn } = interior;
      ctx.camera.position.set(spawn.x, EYE_HEIGHT, spawn.z);
      // Face the window wall (+z in plan space, rotated by the unit orientation).
      const rad = (orientationToDegrees(unit.orientation) * Math.PI) / 180;
      ctx.camera.lookAt(spawn.x + Math.sin(rad), EYE_HEIGHT, spawn.z + Math.cos(rad));
      ctx.camera.rotation.order = "YXZ";
      yawRef.current = ctx.camera.rotation.y;
      pitchRef.current = ctx.camera.rotation.x;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ctx, unitKey]);

  // Walk controls: WASD keys on the focused host, touch joystick on the left,
  // drag-to-look everywhere else.
  const keysRef = useRef(new Set<string>());
  const joystickRef = useRef<{ originX: number; originY: number; dx: number; dy: number } | null>(null);
  const lookRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);

  useEffect(() => {
    if (!ctx || mode !== "walk") return;
    const host = hostRef.current;
    const dom = ctx.renderer.domElement;
    if (!host) return;
    const activeKeys = keysRef.current;
    host.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (MOVE_KEYS[event.code]) {
        event.preventDefault();
        activeKeys.add(event.code);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => activeKeys.delete(event.code);
    host.addEventListener("keydown", onKeyDown);
    host.addEventListener("keyup", onKeyUp);

    const onPointerDown = (event: PointerEvent) => {
      const bounds = dom.getBoundingClientRect();
      const relativeX = (event.clientX - bounds.left) / bounds.width;
      if (event.pointerType === "touch" && relativeX < 0.45) {
        setTouchJoystick(true);
        joystickRef.current = { originX: event.clientX, originY: event.clientY, dx: 0, dy: 0 };
      } else {
        lookRef.current = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY };
      }
      dom.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      const joystick = joystickRef.current;
      if (joystick && event.pointerType === "touch") {
        const dx = event.clientX - joystick.originX;
        const dy = event.clientY - joystick.originY;
        const length = Math.hypot(dx, dy);
        const scale = length > 44 ? 44 / length : 1;
        joystick.dx = dx * scale / 44;
        joystick.dy = dy * scale / 44;
        return;
      }
      const look = lookRef.current;
      if (look && event.pointerId === look.pointerId) {
        yawRef.current -= (event.clientX - look.lastX) * 0.005;
        pitchRef.current = Math.max(-1.2, Math.min(1.2, pitchRef.current - (event.clientY - look.lastY) * 0.005));
        look.lastX = event.clientX;
        look.lastY = event.clientY;
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      if (joystickRef.current) {
        joystickRef.current = null;
        setTouchJoystick(false);
      }
      if (lookRef.current?.pointerId === event.pointerId) lookRef.current = null;
    };
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("pointercancel", onPointerUp);

    const unregister = ctx.onFrame((dt) => {
      const interior = interiorRef.current;
      if (!interior) return;
      ctx.camera.rotation.order = "YXZ";
      ctx.camera.rotation.set(pitchRef.current, yawRef.current, 0);

      let moveX = 0;
      let moveZ = 0;
      activeKeys.forEach((code) => {
        const [keyX, keyZ] = MOVE_KEYS[code] ?? [0, 0];
        moveX += keyX;
        moveZ += keyZ;
      });
      const joystick = joystickRef.current;
      if (joystick) {
        moveX += joystick.dx;
        moveZ += joystick.dy;
      }
      const length = Math.hypot(moveX, moveZ);
      if (length < 0.01) return;
      if (length > 1) {
        moveX /= length;
        moveZ /= length;
      }
      const speed = activeKeys.has("ShiftLeft") || activeKeys.has("ShiftRight") ? 4.2 : 2.2;
      const yaw = yawRef.current;
      // Camera-space movement: forward is where the camera looks (XZ plane).
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      const candidateX = ctx.camera.position.x + (forwardX * -moveZ + rightX * moveX) * speed * dt;
      const candidateZ = ctx.camera.position.z + (forwardZ * -moveZ + rightZ * moveX) * speed * dt;

      // Slide along walls: try the full step, then axis-separated steps.
      const margin = 0.3;
      const inside = (point: { x: number; z: number }) => {
        const local = interior.localFromWorld(point);
        return interior.roomRects.some(
          (rect) => local.x > rect.x + margin && local.x < rect.x + rect.w - margin && local.z > rect.z + margin && local.z < rect.z + rect.d - margin,
        );
      };
      const current = { x: ctx.camera.position.x, z: ctx.camera.position.z };
      if (inside({ x: candidateX, z: candidateZ })) {
        ctx.camera.position.set(candidateX, EYE_HEIGHT, candidateZ);
      } else if (inside({ x: candidateX, z: current.z })) {
        ctx.camera.position.set(candidateX, EYE_HEIGHT, current.z);
      } else if (inside({ x: current.x, z: candidateZ })) {
        ctx.camera.position.set(current.x, EYE_HEIGHT, candidateZ);
      }
    });

    return () => {
      host.removeEventListener("keydown", onKeyDown);
      host.removeEventListener("keyup", onKeyUp);
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("pointercancel", onPointerUp);
      activeKeys.clear();
      joystickRef.current = null;
      lookRef.current = null;
      unregister();
    };
  }, [ctx, mode]);

  const furnishingLabel = unit.furnishing === "UNFURNISHED" ? "bare" : unit.furnishing === "FURNISHED" ? "fully furnished" : "semi-furnished";

  return (
    <div data-hotkey-scope="viewer" className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
      <div
        ref={hostRef}
        tabIndex={mode === "walk" ? 0 : -1}
        className="w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        style={{ height }}
      />
      {!ctx && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-sm text-neutral-500" role="status">
          Loading 3D layout…
        </div>
      )}
      <div className="pointer-events-none absolute left-3 top-3 max-w-[70%] rounded-lg bg-white/90 px-3 py-2 text-xs text-neutral-700 shadow-sm backdrop-blur">
        {unit.publicLabel} · {unit.unitTypeName}
        {unit.areaSqm ? ` · ${unit.areaSqm} m²` : ""} · {furnishingLabel}
      </div>
      <div className="absolute right-3 top-3 flex overflow-hidden rounded-lg shadow-sm">
        <button
          type="button"
          aria-pressed={mode === "orbit"}
          onClick={() => setMode("orbit")}
          className={mode === "orbit" ? "bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white" : "bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-700 backdrop-blur hover:bg-white"}
        >
          Orbit
        </button>
        <button
          type="button"
          aria-pressed={mode === "walk"}
          onClick={() => setMode("walk")}
          className={mode === "walk" ? "bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white" : "bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-700 backdrop-blur hover:bg-white"}
        >
          Walkthrough
        </button>
      </div>
      {ctx && mode === "orbit" && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-neutral-700 shadow-sm backdrop-blur">
          Drag: rotate · Wheel/pinch: zoom · Right-drag: pan — or open Walkthrough
        </div>
      )}
      {ctx && mode === "walk" && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-neutral-700 shadow-sm backdrop-blur">
          Desktop: W A S D + drag to look · Touch: left-side joystick + drag to look
        </div>
      )}
      {touchJoystick && mode === "walk" && <TouchJoystick />}
    </div>
  );
}

/** Visual echo of the invisible touch joystick region (positioned near first touch). */
function TouchJoystick() {
  return (
    <div className="pointer-events-none absolute bottom-6 left-6 h-24 w-24 rounded-full border-2 border-white/70 bg-white/20" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
    </div>
  );
}
