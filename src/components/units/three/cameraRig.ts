import type * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type Vec3Like = { x: number; y: number; z: number };

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface CameraRig {
  /** Animate camera position and orbit target. User interaction cancels a running flight. */
  flyTo(position: Vec3Like, target: Vec3Like, durationMs?: number): void;
  /** Jump without animation (also used when the user prefers reduced motion). */
  snapTo(position: Vec3Like, target: Vec3Like): void;
  /** Advance any running animation; call once per frame with the frame delta in seconds. */
  update(dt: number): void;
  isActive(): boolean;
  dispose(): void;
}

const easeInOutQuintic = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

export function createCameraRig(camera: THREE.PerspectiveCamera, controls: OrbitControls): CameraRig {
  let animating = false;
  let elapsed = 0;
  let duration = 0.7;
  const fromPos = { x: 0, y: 0, z: 0 };
  const toPos = { x: 0, y: 0, z: 0 };
  const fromTarget = { x: 0, y: 0, z: 0 };
  const toTarget = { x: 0, y: 0, z: 0 };

  const cancel = () => {
    animating = false;
  };
  // Any manual drag/zoom takes ownership of the camera back from the rig.
  controls.addEventListener("start", cancel);

  return {
    flyTo(position, target, durationMs = 700) {
      if (prefersReducedMotion()) {
        this.snapTo(position, target);
        return;
      }
      fromPos.x = camera.position.x;
      fromPos.y = camera.position.y;
      fromPos.z = camera.position.z;
      toPos.x = position.x;
      toPos.y = position.y;
      toPos.z = position.z;
      fromTarget.x = controls.target.x;
      fromTarget.y = controls.target.y;
      fromTarget.z = controls.target.z;
      toTarget.x = target.x;
      toTarget.y = target.y;
      toTarget.z = target.z;
      elapsed = 0;
      duration = Math.max(0.05, durationMs / 1000);
      animating = true;
    },
    snapTo(position, target) {
      animating = false;
      camera.position.set(position.x, position.y, position.z);
      controls.target.set(target.x, target.y, target.z);
      controls.update();
    },
    update(dt) {
      if (!animating) return;
      elapsed = Math.min(elapsed + dt, duration);
      const t = easeInOutQuintic(elapsed / duration);
      camera.position.set(
        fromPos.x + (toPos.x - fromPos.x) * t,
        fromPos.y + (toPos.y - fromPos.y) * t,
        fromPos.z + (toPos.z - fromPos.z) * t,
      );
      controls.target.set(
        fromTarget.x + (toTarget.x - fromTarget.x) * t,
        fromTarget.y + (toTarget.y - fromTarget.y) * t,
        fromTarget.z + (toTarget.z - fromTarget.z) * t,
      );
      if (elapsed >= duration) animating = false;
    },
    isActive: () => animating,
    dispose() {
      controls.removeEventListener("start", cancel);
    },
  };
}
