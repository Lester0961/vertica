"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function UnitInterior3D({ bedrooms, label }: { bedrooms: number; label: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8ece6);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(7.5, 6.2, 8.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", `Interactive conceptual 3D layout for ${label}. Drag to rotate, scroll or pinch to zoom, and right-drag to pan.`);
    host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.6, 0);
    controls.minDistance = 5;
    controls.maxDistance = 18;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x768076, 2.2));
    const sun = new THREE.DirectionalLight(0xfff4dc, 3.4);
    sun.position.set(5, 9, 6); sun.castShadow = true; scene.add(sun);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xd3b990, roughness: 0.72 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.88 });
    const forest = new THREE.MeshStandardMaterial({ color: 0x1c5a43, roughness: 0.62 });
    const linen = new THREE.MeshStandardMaterial({ color: 0xc6c8bd, roughness: 0.9 });
    const roomWidth = bedrooms >= 2 ? 8 : bedrooms === 1 ? 6.8 : 5.8;
    const roomDepth = 5;
    const addBox = (size: [number, number, number], position: [number, number, number], material: THREE.Material) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); return mesh; };
    addBox([roomWidth, 0.12, roomDepth], [0, 0, 0], floorMaterial);
    addBox([roomWidth, 2.4, 0.12], [0, 1.2, -roomDepth / 2], wallMaterial);
    addBox([0.12, 2.4, roomDepth], [-roomWidth / 2, 1.2, 0], wallMaterial);
    addBox([1.9, 0.38, 0.9], [1.1, 0.25, 1.15], linen);
    addBox([1.05, 0.7, 0.55], [-0.6, 0.4, 1.4], forest);
    addBox([1.7, 0.5, 0.85], [-roomWidth / 2 + 1.15, 0.3, -1.45], new THREE.MeshStandardMaterial({ color: 0x887258, roughness: 0.78 }));
    for (let index = 0; index < bedrooms; index += 1) {
      const x = roomWidth / 2 - 1.15 - index * 2.25;
      addBox([0.1, 2.1, 2.15], [x - 1.05, 1.05, -1.35], wallMaterial);
      addBox([1.45, 0.32, 1.85], [x, 0.22, -1.45], linen);
    }
    const grid = new THREE.GridHelper(18, 18, 0xb8c2b8, 0xd9dfd9); grid.position.y = -0.08; scene.add(grid);
    const resize = () => { const width = host.clientWidth; const height = host.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    let frame = 0; const render = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(render); }; render();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); renderer.dispose(); scene.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose()); } }); host.removeChild(renderer.domElement); };
  }, [bedrooms, label]);
  return <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100"><div ref={hostRef} className="h-[380px] w-full touch-none" /><p className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-neutral-700 shadow-sm backdrop-blur">Conceptual 3D layout · drag, zoom, and pan</p></div>;
}
