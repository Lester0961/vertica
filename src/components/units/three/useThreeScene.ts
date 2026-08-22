"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createCameraRig, type CameraRig } from "@/components/units/three/cameraRig";

export type FrameCallback = (dt: number, elapsedSeconds: number) => void;

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  rig: CameraRig;
  /** Register a per-frame callback (animations, pulses, movement). Returns an unregister function. */
  onFrame(callback: FrameCallback): () => void;
  /** Dispose an object subtree: geometries and materials. Safe to call on removal. */
  disposeSubtree(root: THREE.Object3D): void;
  resetClock(): void;
}

export interface ThreeSceneOptions {
  ariaLabel: string;
  cameraFov?: number;
  shadows?: boolean;
  /** Defer WebGL setup (e.g. until scrolled into view). The hook stays callable. */
  enabled?: boolean;
}

/**
 * Owns the renderer/scene/camera/controls lifecycle once for a 3D component.
 * Scene *content* is built by the caller in its own effects so data changes can
 * mutate objects instead of tearing down the whole WebGL context.
 */
export function useThreeScene(hostRef: React.RefObject<HTMLDivElement | null>, options: ThreeSceneOptions): SceneContext | null {
  const [ctx, setCtx] = useState<SceneContext | null>(null);
  const enabled = options.enabled !== false;
  const { ariaLabel, cameraFov = 42, shadows = true } = options;

  useEffect(() => {
    if (!enabled) return;
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(cameraFov, 1, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    if (shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", ariaLabel);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    const rig = createCameraRig(camera, controls);

    const frameCallbacks = new Set<FrameCallback>();
    let frame = 0;
    let previous = performance.now();
    let elapsed = 0;
    const render = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      elapsed += dt;
      rig.update(dt);
      frameCallbacks.forEach((callback) => callback(dt, elapsed));
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const context: SceneContext = {
      scene,
      camera,
      renderer,
      controls,
      rig,
      onFrame(callback) {
        frameCallbacks.add(callback);
        return () => frameCallbacks.delete(callback);
      },
      disposeSubtree(root) {
        root.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
            object.geometry.dispose();
            const material = object.material;
            (Array.isArray(material) ? material : [material]).forEach((entry) => entry.dispose());
          }
        });
      },
      resetClock() {
        elapsed = 0;
      },
    };
    setCtx(context);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      rig.dispose();
      controls.dispose();
      context.disposeSubtree(scene);
      renderer.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
      setCtx(null);
    };
  }, [ariaLabel, cameraFov, enabled, hostRef, shadows]);

  return ctx;
}
