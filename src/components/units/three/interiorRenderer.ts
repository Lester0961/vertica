import * as THREE from "three";
import { furnitureForLevel, type FloorPlan, type FurnitureItem, type Rect } from "@/features/units/floorPlans";

export const WALL_HEIGHT = 2.6;
export const WALL_THICKNESS = 0.1;
export const EYE_HEIGHT = 1.6;

export interface InteriorSceneOptions {
  furnishing?: string | null;
  orientationDeg?: number;
  balcony?: boolean;
  prefersDark?: boolean;
}

export interface InteriorSceneResult {
  group: THREE.Group;
  /** Walkthrough spawn (world coordinates, already rotated). */
  spawn: { x: number; z: number };
  /** Rotate a world point back into plan space (for collision checks). */
  localFromWorld(point: { x: number; z: number }): { x: number; z: number };
  roomRects: Rect[];
  setCeilingVisible(visible: boolean): void;
}

interface MaterialSet {
  wood: THREE.MeshStandardMaterial;
  tile: THREE.MeshStandardMaterial;
  plinth: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  fabric: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  porcelain: THREE.MeshStandardMaterial;
  screen: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  pot: THREE.MeshStandardMaterial;
  rug: THREE.MeshStandardMaterial;
  linen: THREE.MeshStandardMaterial;
  exterior: THREE.MeshStandardMaterial;
}

function createMaterials(prefersDark: boolean): MaterialSet {
  const std = (params: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(params);
  return {
    wood: std({ color: 0xc9a26b, roughness: 0.7 }),
    tile: std({ color: prefersDark ? 0xaeb6ba : 0xdde2e6, roughness: 0.35 }),
    plinth: std({ color: prefersDark ? 0x565a52 : 0xb9b4a8, roughness: 0.85 }),
    wall: std({ color: prefersDark ? 0x4b4f4a : 0xf4f1e8, roughness: 0.9 }),
    glass: std({ color: 0xaed4e4, roughness: 0.1, metalness: 0.2, emissive: 0x87b8cc, emissiveIntensity: 0.4, transparent: true, opacity: 0.5 }),
    fabric: std({ color: 0xc6c8bd, roughness: 0.9 }),
    accent: std({ color: 0x1c5a43, roughness: 0.62 }),
    woodDark: std({ color: 0x887258, roughness: 0.78 }),
    metal: std({ color: 0x9aa3a8, roughness: 0.35, metalness: 0.6 }),
    porcelain: std({ color: 0xf2f4f2, roughness: 0.2 }),
    screen: std({ color: 0x101418, roughness: 0.3, emissive: 0x223038, emissiveIntensity: 0.25 }),
    foliage: std({ color: 0x3d7a52, roughness: 0.8 }),
    pot: std({ color: 0x8a5f4a, roughness: 0.85 }),
    rug: std({ color: 0xb9c0b4, roughness: 0.95 }),
    linen: std({ color: 0xe9e7dc, roughness: 0.9 }),
    exterior: std({ color: prefersDark ? 0x2c3230 : 0xcfd8d4, roughness: 0.9 }),
  };
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildWall(wall: FloorPlan["walls"][number], materials: MaterialSet): THREE.Group {
  const group = new THREE.Group();
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.hypot(dx, dz);
  group.position.set(wall.from[0], 0, wall.from[1]);
  group.rotation.y = -Math.atan2(dz, dx);

  const openings = [...(wall.openings ?? [])].sort((a, b) => a.at - b.at);
  let cursor = 0;
  const solid = (from: number, to: number) => {
    if (to - from <= 0.01) return;
    group.add(box(to - from, WALL_HEIGHT, WALL_THICKNESS, materials.wall, (from + to) / 2, WALL_HEIGHT / 2, 0));
  };
  openings.forEach((opening) => {
    const start = Math.max(0, opening.at * length - opening.width / 2);
    const end = Math.min(length, start + opening.width);
    solid(cursor, start);
    const width = end - start;
    if (opening.kind === "window") {
      const sill = opening.sillHeight ?? 0.9;
      const windowHeight = Math.min(1.25, WALL_HEIGHT - sill - 0.35);
      if (sill > 0.02) group.add(box(width, sill, WALL_THICKNESS, materials.wall, (start + end) / 2, sill / 2, 0));
      group.add(box(width, WALL_HEIGHT - sill - windowHeight, WALL_THICKNESS, materials.wall, (start + end) / 2, sill + windowHeight + (WALL_HEIGHT - sill - windowHeight) / 2, 0));
      const pane = box(width, windowHeight, 0.03, materials.glass, (start + end) / 2, sill + windowHeight / 2, 0);
      pane.castShadow = false;
      group.add(pane);
    } else {
      // Door: header above the opening only.
      group.add(box(width, WALL_HEIGHT - 2.05, WALL_THICKNESS, materials.wall, (start + end) / 2, 2.05 + (WALL_HEIGHT - 2.05) / 2, 0));
    }
    cursor = end;
  });
  solid(cursor, length);
  return group;
}

function buildFurniture(item: FurnitureItem, materials: MaterialSet): THREE.Group {
  const group = new THREE.Group();
  group.position.set(item.x, 0, item.z);
  group.rotation.y = item.rotY ?? 0;
  const { w, d } = item;
  switch (item.kind) {
    case "bed":
    case "bedSingle": {
      const single = item.kind === "bedSingle";
      group.add(box(w, 0.26, d, materials.woodDark, 0, 0.14, 0));
      group.add(box(w - 0.08, 0.16, d - 0.08, materials.linen, 0, 0.35, 0));
      group.add(box(w, 0.9, 0.09, materials.woodDark, 0, 0.55, -d / 2 + 0.045));
      const pillows = single ? 1 : 2;
      for (let index = 0; index < pillows; index += 1) {
        group.add(box(w / pillows - 0.14, 0.1, 0.42, materials.porcelain, (index - (pillows - 1) / 2) * (w / pillows), 0.48, -d / 2 + 0.32));
      }
      const throwBlanket = box(w - 0.06, 0.03, d * 0.4, single ? materials.accent : materials.fabric, 0, 0.45, d / 2 - d * 0.22);
      group.add(throwBlanket);
      break;
    }
    case "sofa":
      group.add(box(w, 0.3, d, materials.fabric, 0, 0.2, 0));
      group.add(box(w, 0.42, 0.16, materials.fabric, 0, 0.55, -d / 2 + 0.08));
      group.add(box(0.16, 0.3, d, materials.fabric, -w / 2 + 0.08, 0.42, 0));
      group.add(box(0.16, 0.3, d, materials.fabric, w / 2 - 0.08, 0.42, 0));
      break;
    case "coffeeTable":
      group.add(box(w, 0.04, d, materials.woodDark, 0, 0.34, 0));
      group.add(box(w * 0.5, 0.32, d * 0.5, materials.metal, 0, 0.16, 0));
      break;
    case "diningTable": {
      group.add(box(w, 0.045, d, materials.woodDark, 0, 0.73, 0));
      [-1, 1].forEach((sideX) => {
        [-1, 1].forEach((sideZ) => {
          group.add(box(0.06, 0.71, 0.06, materials.woodDark, (sideX * (w / 2 - 0.08)), 0.355, sideZ * (d / 2 - 0.08)));
        });
      });
      break;
    }
    case "chair":
      group.add(box(w, 0.04, d, materials.woodDark, 0, 0.44, 0));
      group.add(box(w, 0.45, 0.04, materials.woodDark, 0, 0.68, -d / 2 + 0.02));
      group.add(box(0.05, 0.44, 0.05, materials.woodDark, -w / 2 + 0.03, 0.22, 0));
      group.add(box(0.05, 0.44, 0.05, materials.woodDark, w / 2 - 0.03, 0.22, 0));
      break;
    case "wardrobe":
      group.add(box(w, 2.0, d, materials.woodDark, 0, 1.0, 0));
      group.add(box(0.02, 1.8, d + 0.01, materials.metal, 0, 1.0, 0));
      break;
    case "desk":
      group.add(box(w, 0.045, d, materials.woodDark, 0, 0.73, 0));
      group.add(box(0.05, 0.71, d - 0.06, materials.woodDark, -w / 2 + 0.04, 0.355, 0));
      group.add(box(0.05, 0.71, d - 0.06, materials.woodDark, w / 2 - 0.04, 0.355, 0));
      break;
    case "kitchenCounter":
      group.add(box(w, 0.82, d, materials.porcelain, 0, 0.41, 0));
      group.add(box(w + 0.04, 0.04, d + 0.04, materials.woodDark, 0, 0.86, 0));
      break;
    case "stove":
      group.add(box(w, 0.88, d, materials.metal, 0, 0.44, 0));
      [-1, 1].forEach((sideX) => {
        [-1, 1].forEach((sideZ) => {
          group.add(box(0.14, 0.015, 0.14, materials.screen, sideX * w * 0.22, 0.885, sideZ * d * 0.2));
        });
      });
      break;
    case "fridge":
      group.add(box(w, 1.75, d, materials.metal, 0, 0.875, 0));
      group.add(box(0.04, 0.7, 0.05, materials.screen, w / 2 - 0.09, 1.15, d / 2 + 0.01));
      break;
    case "toilet":
      group.add(box(w, 0.4, d * 0.6, materials.porcelain, 0, 0.2, d * 0.15));
      group.add(box(w, 0.52, d * 0.35, materials.porcelain, 0, 0.26, -d / 2 + 0.08));
      break;
    case "shower": {
      group.add(box(w, 0.06, d, materials.tile, 0, 0.03, 0));
      group.add(box(w, 1.9, 0.03, materials.glass, 0, 1.0, -d / 2 + 0.015));
      group.add(box(0.03, 1.9, d, materials.glass, -w / 2 + 0.015, 1.0, 0));
      break;
    }
    case "sink":
      group.add(box(w, 0.78, d, materials.woodDark, 0, 0.39, 0));
      group.add(box(w - 0.1, 0.06, d - 0.1, materials.porcelain, 0, 0.81, 0));
      break;
    case "tvUnit":
      group.add(box(w, 0.4, d, materials.woodDark, 0, 0.2, 0));
      group.add(box(w * 0.8, 0.5, 0.05, materials.screen, 0, 0.78, -d / 2 + 0.05));
      break;
    case "plant": {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2 * 0.8, 0.34, 10), materials.pot);
      pot.position.y = 0.17;
      pot.castShadow = true;
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(w * 0.75, 10, 8), materials.foliage);
      leaves.position.y = 0.34 + w * 0.6;
      leaves.castShadow = true;
      group.add(pot, leaves);
      break;
    }
    case "rug": {
      const rugMesh = box(w, 0.015, d, materials.rug, 0, 0.008, 0);
      rugMesh.castShadow = false;
      group.add(rugMesh);
      break;
    }
  }
  return group;
}

export function buildInteriorScene(plan: FloorPlan, options: InteriorSceneOptions = {}): InteriorSceneResult {
  const materials = createMaterials(!!options.prefersDark);
  const group = new THREE.Group();
  const rad = ((options.orientationDeg ?? 0) * Math.PI) / 180;
  group.rotation.y = rad;

  // Plinth + room flooring.
  const plinth = box(plan.overallW + 0.5, 0.16, plan.overallD + 0.5, materials.plinth, 0, -0.13, 0);
  group.add(plinth);
  plan.rooms.forEach((room) => {
    group.add(box(room.w, 0.08, room.d, room.floor === "tile" ? materials.tile : materials.wood, room.x + room.w / 2, -0.04, room.z + room.d / 2));
  });

  // Walls with door/window openings.
  plan.walls.forEach((wall) => group.add(buildWall(wall, materials)));

  // Furniture for the unit's furnishing level.
  furnitureForLevel(plan, options.furnishing).forEach((item) => group.add(buildFurniture(item, materials)));

  // Balcony off the window face.
  if (options.balcony) {
    const balconyWidth = Math.min(plan.overallW * 0.55, 3.2);
    const balconyGroup = new THREE.Group();
    balconyGroup.position.set(0, 0, plan.overallD / 2 + 0.72);
    balconyGroup.add(box(balconyWidth, 0.1, 1.35, materials.plinth, 0, -0.05, 0));
    balconyGroup.add(box(balconyWidth, 0.95, 0.04, materials.glass, 0, 0.48, 0.64));
    balconyGroup.add(box(0.04, 0.95, 1.3, materials.glass, -balconyWidth / 2 + 0.02, 0.48, 0));
    balconyGroup.add(box(0.04, 0.95, 1.3, materials.glass, balconyWidth / 2 - 0.02, 0.48, 0));
    const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.4, 10), materials.pot);
    planter.position.set(balconyWidth / 2 - 0.4, 0.25, 0.3);
    planter.castShadow = true;
    const planterPlant = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 7), materials.foliage);
    planterPlant.position.set(balconyWidth / 2 - 0.4, 0.62, 0.3);
    balconyGroup.add(planter, planterPlant);
    group.add(balconyGroup);
  }

  // Soft exterior context visible through the windows.
  const ground = box(60, 0.06, 44, materials.exterior, 0, -0.26, 6);
  ground.castShadow = false;
  group.add(ground);
  [
    { x: -14, z: 16, w: 4, h: 7, d: 4 },
    { x: 6, z: 20, w: 5, h: 10, d: 4 },
    { x: 18, z: 12, w: 3.5, h: 6, d: 3.5 },
    { x: -24, z: 10, w: 4, h: 8, d: 4 },
  ].forEach((building) => {
    const mesh = box(building.w, building.h, building.d, materials.exterior, building.x, building.h / 2 - 0.2, building.z);
    mesh.castShadow = false;
    group.add(mesh);
  });

  // Ceiling + light strips (walkthrough mode only).
  const ceilingGroup = new THREE.Group();
  const ceiling = box(plan.overallW, 0.08, plan.overallD, materials.wall, 0, WALL_HEIGHT + 0.04, 0);
  ceiling.castShadow = false;
  ceilingGroup.add(ceiling);
  [-plan.overallW / 4, plan.overallW / 4].forEach((x) => {
    const strip = box(plan.overallW * 0.3, 0.03, 0.12, materials.glass, x, WALL_HEIGHT - 0.02, 0);
    strip.castShadow = false;
    ceilingGroup.add(strip);
  });
  ceilingGroup.visible = false;
  group.add(ceilingGroup);

  const living = plan.rooms.find((room) => room.id === plan.livingRoomId) ?? plan.rooms[0]!;
  const rotate = (point: { x: number; z: number }, angle: number) => ({
    x: point.x * Math.cos(angle) + point.z * Math.sin(angle),
    z: -point.x * Math.sin(angle) + point.z * Math.cos(angle),
  });

  return {
    group,
    spawn: rotate({ x: living.x + living.w / 2, z: living.z + living.d / 2 }, rad),
    localFromWorld: (point) => rotate(point, -rad),
    roomRects: plan.rooms.map((room) => ({ x: room.x, z: room.z, w: room.w, d: room.d })),
    setCeilingVisible: (visible: boolean) => {
      ceilingGroup.visible = visible;
    },
  };
}
