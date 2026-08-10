"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type BuildingUnit3D = {
  id: string;
  publicLabel: string;
  unitTypeName: string;
  floorNumber: number;
  status?: string;
};

const STATUS_COLORS: Record<string, number> = {
  AVAILABLE: 0x3f9b64,
  OCCUPIED: 0x3778c2,
  RESERVED: 0xd99b32,
  MAINTENANCE: 0xc95d4e,
  UNAVAILABLE: 0x73736c,
};

export function Building3D({ units, selectedId, onSelect }: {
  units: BuildingUnit3D[];
  selectedId?: string;
  onSelect: (unit: BuildingUnit3D) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef(onSelect);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || units.length === 0) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f4f1);
    scene.fog = new THREE.Fog(0xf2f4f1, 20, 42);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(11, 9, 14);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", "Interactive 3D building. Drag to rotate, wheel or pinch to zoom, right-drag to pan, and select a colored unit for details.");
    renderer.domElement.setAttribute("role", "img");
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.minDistance = 7;
    controls.maxDistance = 30;
    controls.target.set(0, 3.2, 0);
    controls.update();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6c756b, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 3.4);
    sun.position.set(8, 15, 10);
    sun.castShadow = true;
    scene.add(sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(28, 24), new THREE.MeshStandardMaterial({ color: 0xdde3dd, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const floors = Array.from(new Set(units.map((unit) => unit.floorNumber))).sort((a, b) => a - b);
    const minFloor = floors[0] ?? 1;
    const unitMeshes: THREE.Mesh[] = [];
    floors.forEach((floorNumber) => {
      const floorUnits = units.filter((unit) => unit.floorNumber === floorNumber).sort((a, b) => a.publicLabel.localeCompare(b.publicLabel));
      const y = (floorNumber - minFloor) * 1.25 + 0.85;
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(7, floorUnits.length * 1.55 + 0.5), 0.12, 2.15),
        new THREE.MeshStandardMaterial({ color: 0xd6d8d3, roughness: 0.8 }),
      );
      slab.position.set(0, y - 0.65, 0);
      slab.receiveShadow = true;
      scene.add(slab);

      floorUnits.forEach((unit, index) => {
        const status = unit.status ?? "AVAILABLE";
        const material = new THREE.MeshStandardMaterial({
          color: STATUS_COLORS[status] ?? STATUS_COLORS.UNAVAILABLE,
          roughness: 0.55,
          emissive: unit.id === selectedId ? 0x173b24 : 0,
          emissiveIntensity: unit.id === selectedId ? 0.45 : 0,
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.05, 1.75), material);
        mesh.position.set((index - (floorUnits.length - 1) / 2) * 1.55, y, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.unit = unit;
        mesh.userData.baseEmissive = unit.id === selectedId ? 0x173b24 : 0;
        unitMeshes.push(mesh);
        scene.add(mesh);

        const windowMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(0.72, 0.48),
          new THREE.MeshStandardMaterial({ color: 0xbfe2ec, emissive: 0x75b8cc, emissiveIntensity: 0.18, roughness: 0.25 }),
        );
        windowMesh.position.set(mesh.position.x, y + 0.05, 0.881);
        scene.add(windowMesh);
      });
    });

    const coreHeight = Math.max(3, floors.length * 1.25 + 1);
    const core = new THREE.Mesh(new THREE.BoxGeometry(1.4, coreHeight, 2.8), new THREE.MeshStandardMaterial({ color: 0xb8bbb5, roughness: 0.9 }));
    core.position.set(0, coreHeight / 2 - 0.05, -1.9);
    core.castShadow = true;
    scene.add(core);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered: THREE.Mesh | null = null;
    let pressedAt: { x: number; y: number } | null = null;
    const hit = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(unitMeshes, false)[0]?.object as THREE.Mesh | undefined;
    };
    const onMove = (event: PointerEvent) => {
      const next = hit(event) ?? null;
      if (hovered !== next) {
        if (hovered) {
          const material = hovered.material as THREE.MeshStandardMaterial;
          material.emissive.setHex(hovered.userData.baseEmissive as number);
          material.emissiveIntensity = hovered.userData.baseEmissive ? 0.45 : 0;
        }
        hovered = next;
        if (hovered) {
          const material = hovered.material as THREE.MeshStandardMaterial;
          material.emissive.setHex(0xffffff);
          material.emissiveIntensity = 0.22;
        }
      }
      renderer.domElement.style.cursor = next ? "pointer" : "grab";
      if (next) {
        const unit = next.userData.unit as BuildingUnit3D;
        const bounds = renderer.domElement.getBoundingClientRect();
        setTooltip({ x: event.clientX - bounds.left + 12, y: event.clientY - bounds.top + 12, text: `${unit.publicLabel} · ${unit.unitTypeName} · ${(unit.status ?? "AVAILABLE").replaceAll("_", " ")}` });
      } else setTooltip(null);
    };
    const onDown = (event: PointerEvent) => { pressedAt = { x: event.clientX, y: event.clientY }; };
    const onUp = (event: PointerEvent) => {
      if (!pressedAt || Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > 5) return;
      const target = hit(event);
      if (target) selectRef.current(target.userData.unit as BuildingUnit3D);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", () => setTooltip(null));

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
    let frame = 0;
    const render = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(render); };
    render();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose());
        }
      });
      host.removeChild(renderer.domElement);
    };
  }, [units, selectedId]);

  return <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
    <div ref={hostRef} className="h-[480px] w-full touch-none" />
    <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-neutral-700 shadow-sm backdrop-blur">Drag: rotate · Wheel/pinch: zoom · Right-drag: pan · Click: select</div>
    {tooltip && <div className="pointer-events-none absolute z-10 max-w-64 rounded-md bg-neutral-950 px-2.5 py-1.5 text-xs text-white shadow-lg" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>}
    <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-lg bg-white/90 p-2 text-[11px] shadow-sm">{Object.entries(STATUS_COLORS).map(([status, color]) => <span key={status} className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `#${color.toString(16).padStart(6, "0")}` }} />{status.toLowerCase().replaceAll("_", " ")}</span>)}</div>
  </div>;
}
