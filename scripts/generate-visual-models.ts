import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const BUILDING_OUTPUT_ROOT = resolve("public/models/vertica/v2");
const INTERIOR_OUTPUT_ROOT = resolve("public/models/vertica/v1");

class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  error: Error | null = null;
  onloadend: ((event: { target: NodeFileReader }) => void) | null = null;

  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.({ target: this });
    });
  }
}

// GLTFExporter uses FileReader for binary buffers in browsers. Node supplies
// Blob but not FileReader, so this minimal adapter keeps the export deterministic.
Object.assign(globalThis, { FileReader: NodeFileReader });

const materials = {
  concrete: new THREE.MeshStandardMaterial({ name: "Concrete limestone", color: 0xd7d4cc, roughness: 0.82 }),
  concreteDark: new THREE.MeshStandardMaterial({ name: "Concrete charcoal", color: 0x4b504b, roughness: 0.78 }),
  metal: new THREE.MeshStandardMaterial({ name: "Powder coated metal", color: 0x222724, roughness: 0.32, metalness: 0.72 }),
  glass: new THREE.MeshPhysicalMaterial({ name: "Facade glass", color: 0x91aeb5, roughness: 0.12, metalness: 0.15, transmission: 0.38, transparent: true, opacity: 0.72 }),
  windowWarm: new THREE.MeshStandardMaterial({ name: "Warm interior glazing", color: 0xb4c3bd, roughness: 0.18, metalness: 0.15, emissive: 0xffc778, emissiveIntensity: 0.38 }),
  wood: new THREE.MeshStandardMaterial({ name: "Oak", color: 0xb88957, roughness: 0.72 }),
  wall: new THREE.MeshStandardMaterial({ name: "Warm wall", color: 0xeeeae1, roughness: 0.9 }),
  tile: new THREE.MeshStandardMaterial({ name: "Stone tile", color: 0xb9b9b2, roughness: 0.5 }),
  fabric: new THREE.MeshStandardMaterial({ name: "Fabric", color: 0xa9aaa1, roughness: 0.94 }),
  linen: new THREE.MeshStandardMaterial({ name: "Linen", color: 0xd8d4c8, roughness: 0.96 }),
  accent: new THREE.MeshStandardMaterial({ name: "Vertica green", color: 0x245c43, roughness: 0.64 }),
  darkWood: new THREE.MeshStandardMaterial({ name: "Smoked oak", color: 0x4b382c, roughness: 0.68 }),
  stone: new THREE.MeshStandardMaterial({ name: "Quartz stone", color: 0xcac8c1, roughness: 0.38 }),
  brass: new THREE.MeshStandardMaterial({ name: "Brushed brass", color: 0x8d774f, roughness: 0.32, metalness: 0.78 }),
  screen: new THREE.MeshStandardMaterial({ name: "Display glass", color: 0x121817, roughness: 0.2, metalness: 0.25, emissive: 0x1b3028, emissiveIntensity: 0.26 }),
  foliage: new THREE.MeshStandardMaterial({ name: "Foliage", color: 0x315e3e, roughness: 0.88 }),
  soil: new THREE.MeshStandardMaterial({ name: "Planter", color: 0x6c5b4b, roughness: 0.9 }),
  ground: new THREE.MeshStandardMaterial({ name: "Landscape ground", color: 0x304537, roughness: 0.96 }),
  pick: new THREE.MeshBasicMaterial({ name: "Selection proxy", color: 0x4dd786, transparent: true, opacity: 0 }),
};

function box(
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function empty(name: string, position: [number, number, number], userData: Record<string, unknown> = {}): THREE.Object3D {
  const object = new THREE.Object3D();
  object.name = name;
  object.position.set(...position);
  object.userData = userData;
  return object;
}

function instancedBoxes(
  name: string,
  size: [number, number, number],
  positions: [number, number, number][],
  material: THREE.Material,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), material, positions.length);
  mesh.name = name;
  const matrix = new THREE.Matrix4();
  positions.forEach((position, index) => {
    matrix.makeTranslation(...position);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addTree(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const tree = new THREE.Group();
  tree.name = `TREE_${x}_${z}`;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.22 * scale, 2.5 * scale, 10), materials.soil);
  trunk.position.y = 1.25 * scale;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 * scale, 2), materials.foliage);
  crown.position.y = 3 * scale;
  crown.scale.set(1, 1.15, 0.9);
  const crownLow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.82 * scale, 1), materials.foliage);
  crownLow.position.set(-0.25 * scale, 2.35 * scale, 0.18 * scale);
  crownLow.scale.set(1.1, 0.9, 0.95);
  tree.add(trunk, crown, crownLow);
  tree.position.set(x, 0, z);
  parent.add(tree);
}

function addStreetLight(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const light = new THREE.Group();
  light.name = `STREET_LIGHT_${x}_${z}`;
  light.add(box("LIGHT_POST", [0.08 * scale, 2.7 * scale, 0.08 * scale], [0, 1.35 * scale, 0], materials.metal));
  light.add(box("LIGHT_ARM", [0.55 * scale, 0.06 * scale, 0.06 * scale], [0.2 * scale, 2.65 * scale, 0], materials.metal));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 10, 8), materials.windowWarm);
  lamp.position.set(0.45 * scale, 2.59 * scale, 0);
  light.add(lamp);
  light.position.set(x, 0, z);
  parent.add(light);
}

function addCar(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const car = new THREE.Group();
  car.name = `DROP_OFF_CAR_${x}_${z}`;
  car.add(box("CAR_BODY", [3.1 * scale, 0.42 * scale, 1.45 * scale], [0, 0.42 * scale, 0], materials.concreteDark));
  car.add(box("CAR_CABIN", [1.55 * scale, 0.48 * scale, 1.2 * scale], [-0.15 * scale, 0.82 * scale, 0], materials.metal));
  car.add(box("CAR_GLASS", [1.18 * scale, 0.28 * scale, 1.22 * scale], [-0.16 * scale, 0.88 * scale, 0], materials.glass));
  for (const wheelZ of [-0.58, 0.58]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.28 * scale, 0.12 * scale, 12), materials.metal);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(-0.78 * scale, 0.29 * scale, wheelZ * scale);
    car.add(wheel);
  }
  car.position.set(x, 0, z);
  parent.add(car);
}

function addBalconyPlant(parent: THREE.Object3D, x: number, y: number, z: number, scale = 1) {
  parent.add(box("BALCONY_PLANTER", [0.65 * scale, 0.28 * scale, 0.34 * scale], [x, y + 0.14 * scale, z], materials.soil));
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 * scale, 1), materials.foliage);
  leaves.position.set(x, y + 0.48 * scale, z);
  leaves.scale.set(1, 1.3, 0.8);
  parent.add(leaves);
}

function createBuilding(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.name = "Vertica Residences exterior";
  scene.userData = { units: "meters", version: "building-realism-v2" };

  const architecture = new THREE.Group();
  architecture.name = "ARCH_BUILDING";
  const width = 30;
  const depth = 13;
  const lobbyHeight = 4.6;
  const floorHeight = 3.2;
  const floors = [2, 3, 4, 5, 6, 7];
  const bayWidth = 6.15;

  architecture.add(box("ARCH_PODIUM", [width + 3, lobbyHeight, depth + 2], [0, lobbyHeight / 2, -0.5], materials.concreteDark));
  architecture.add(box("ARCH_PODIUM_STONE_BAND", [width + 3.25, 0.7, depth + 2.2], [0, 0.35, -0.5], materials.tile));
  architecture.add(box("ARCH_LOBBY_GLASS", [20, 2.9, 0.18], [0, 2.25, depth / 2 + 0.55], materials.glass));
  architecture.add(box("ARCH_ENTRY_CANOPY", [10, 0.25, 5], [0, 4.35, depth / 2 + 3], materials.metal));
  architecture.add(box("ARCH_ENTRY_SIGN", [5.6, 0.42, 0.14], [0, 3.4, depth / 2 + 0.68], materials.concreteDark));
  architecture.add(box("ARCH_ENTRY_SIGN_LIGHT", [3.8, 0.04, 0.04], [0, 3.18, depth / 2 + 0.78], materials.windowWarm));
  architecture.add(box("ARCH_ENTRY_STEPS", [12, 0.14, 1.15], [0, 0.08, depth / 2 + 1.3], materials.tile));
  architecture.add(instancedBoxes("ARCH_CANOPY_COLUMNS", [0.24, 4.1, 0.24], [[-4.4, 2.05, depth / 2 + 4.9], [4.4, 2.05, depth / 2 + 4.9]], materials.metal));
  architecture.add(instancedBoxes("ARCH_LOBBY_DOOR_FRAMES", [0.12, 2.8, 0.2], [[-3.1, 2.2, depth / 2 + 0.7], [0, 2.2, depth / 2 + 0.7], [3.1, 2.2, depth / 2 + 0.7]], materials.metal));
  architecture.add(instancedBoxes("ARCH_LOBBY_PILASTERS", [0.22, 3.1, 0.22], [[-10.2, 1.55, depth / 2 + 0.62], [10.2, 1.55, depth / 2 + 0.62]], materials.concrete));
  architecture.add(box("ARCH_CORE", [4.8, lobbyHeight + floors.length * floorHeight + 2.2, 5], [0, (lobbyHeight + floors.length * floorHeight + 2.2) / 2, -3.2], materials.concrete));

  floors.forEach((floorNumber, floorIndex) => {
    const floor = new THREE.Group();
    floor.name = `FLOOR_${String(floorNumber).padStart(2, "0")}`;
    const y = lobbyHeight + floorIndex * floorHeight;
    floor.add(box(`SLAB_${floorNumber}`, [width + 1.4, 0.28, depth + 0.8], [0, y, 0], materials.concrete));
    floor.add(box(`SPANDREL_${floorNumber}`, [width + 1.4, 0.48, 0.25], [0, y + 0.3, depth / 2 + 0.42], materials.concreteDark));

    const bayPositions = Array.from({ length: 4 }, (_, index) => (index - 1.5) * (bayWidth + 0.7));
    const centerY = y + floorHeight / 2;
    floor.add(instancedBoxes(`UNIT_SHELLS_F${floorNumber}`, [bayWidth, 2.85, 8.8], bayPositions.map((x) => [x, centerY, 0.7]), materials.concrete));
    floor.add(instancedBoxes(`WINDOWS_F${floorNumber}`, [bayWidth * 0.72, 1.85, 0.12], bayPositions.map((x) => [x, centerY + 0.15, depth / 2 + 0.18]), materials.windowWarm));
    floor.add(instancedBoxes(`WINDOW_FRAMES_TOP_F${floorNumber}`, [bayWidth * 0.76, 0.07, 0.2], bayPositions.map((x) => [x, centerY + 1.13, depth / 2 + 0.29]), materials.metal));
    floor.add(instancedBoxes(`WINDOW_FRAMES_BOTTOM_F${floorNumber}`, [bayWidth * 0.76, 0.07, 0.2], bayPositions.map((x) => [x, centerY - 0.83, depth / 2 + 0.29]), materials.metal));
    floor.add(instancedBoxes(`WINDOW_FRAMES_SIDES_F${floorNumber}`, [0.07, 1.9, 0.2], bayPositions.flatMap((x) => [[x - bayWidth * 0.38, centerY + 0.15, depth / 2 + 0.29], [x + bayWidth * 0.38, centerY + 0.15, depth / 2 + 0.29]]), materials.metal));
    floor.add(instancedBoxes(`MULLIONS_V_F${floorNumber}`, [0.08, 1.9, 0.18], bayPositions.map((x) => [x, centerY + 0.15, depth / 2 + 0.28]), materials.metal));
    floor.add(instancedBoxes(`MULLIONS_H_F${floorNumber}`, [bayWidth * 0.72, 0.08, 0.18], bayPositions.map((x) => [x, centerY + 0.15, depth / 2 + 0.28]), materials.metal));
    floor.add(instancedBoxes(`BALCONIES_F${floorNumber}`, [bayWidth * 0.88, 0.18, 1.6], bayPositions.map((x) => [x, y + 0.12, depth / 2 + 0.95]), materials.concreteDark));
    floor.add(instancedBoxes(`RAILS_F${floorNumber}`, [bayWidth * 0.84, 1.05, 0.06], bayPositions.map((x) => [x, y + 0.7, depth / 2 + 1.75]), materials.glass));
    floor.add(instancedBoxes(`RAIL_POSTS_F${floorNumber}`, [0.06, 1.1, 0.06], bayPositions.flatMap((x) => [[x - bayWidth * 0.4, y + 0.7, depth / 2 + 1.75], [x + bayWidth * 0.4, y + 0.7, depth / 2 + 1.75]]), materials.metal));
    floor.add(instancedBoxes(`CORRIDOR_RAIL_F${floorNumber}`, [width - 2.2, 0.9, 0.06], [[0, y + 0.62, -depth / 2 - 0.08]], materials.glass));
    const sideWindowPositions: [number, number, number][] = [
      [-width / 2 - 0.08, centerY + 0.1, -3.1],
      [-width / 2 - 0.08, centerY + 0.1, 2.4],
      [width / 2 + 0.08, centerY + 0.1, -3.1],
      [width / 2 + 0.08, centerY + 0.1, 2.4],
    ];
    floor.add(instancedBoxes(`SIDE_WINDOWS_F${floorNumber}`, [0.12, 1.42, 1.55], sideWindowPositions, materials.windowWarm));
    floor.add(instancedBoxes(`BALCONY_DIVIDERS_F${floorNumber}`, [0.1, 2.45, 1.55], [-14.2, -7.25, 0, 7.25, 14.2].map((x) => [x, centerY, depth / 2 + 0.98]), materials.concreteDark));

    bayPositions.forEach((x, index) => {
      if (index % 2 === floorIndex % 2) addBalconyPlant(floor, x + bayWidth * 0.25, y + 0.24, depth / 2 + 0.9, 0.9);
    });

    for (let bay = 1; bay <= 4; bay += 1) {
      const x = (bay - 2.5) * (bayWidth + 0.7);
      const key = `F${String(floorNumber).padStart(2, "0")}_B${String(bay).padStart(2, "0")}`;
      const pick = box(`PICK_${key}`, [bayWidth * 0.9, 2.55, 1.7], [x, centerY, depth / 2 + 0.95], materials.pick);
      pick.userData = { kind: "unit-selection", floorNumber, bay };
      floor.add(pick);
      floor.add(empty(`CAM_${key}`, [x * 0.75, centerY + 2.2, depth / 2 + 10], { kind: "camera-anchor" }));
    }
    architecture.add(floor);
  });

  const roofY = lobbyHeight + floors.length * floorHeight;
  architecture.add(box("ARCH_ROOF", [width + 2.2, 0.45, depth + 1.2], [0, roofY + 0.2, 0], materials.concreteDark));
  architecture.add(box("ARCH_ROOF_OVERHANG", [width + 5, 0.35, depth + 4], [0, roofY + 2.4, 0.6], materials.metal));
  architecture.add(box("ARCH_ROOF_HOUSE", [7, 2.8, 5], [-4, roofY + 1.6, -1.8], materials.concrete));
  architecture.add(box("ARCH_ROOF_TERRACE", [12, 0.12, 4.5], [7, roofY + 0.5, 1.2], materials.tile));
  architecture.add(instancedBoxes("ARCH_ROOF_PARAPET", [12, 0.58, 0.16], [[7, roofY + 0.78, -1.1], [7, roofY + 0.78, 3.5]], materials.concreteDark));
  architecture.add(box("ARCH_ROOF_MECHANICAL_A", [2.4, 1.35, 1.8], [5.2, roofY + 1.15, 1.5], materials.metal));
  architecture.add(box("ARCH_ROOF_MECHANICAL_B", [1.5, 1.1, 1.5], [8.2, roofY + 1.02, 2.6], materials.concreteDark));
  const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.8, 16), materials.metal);
  waterTank.position.set(-1.8, roofY + 3.35, -1.8);
  architecture.add(waterTank);

  for (const x of [-11.5, -4, 4, 11.5]) {
    architecture.add(box(`FIN_${x}`, [0.32, floors.length * floorHeight + 1.2, 0.9], [x, lobbyHeight + floors.length * floorHeight / 2, depth / 2 + 0.62], materials.concreteDark));
  }

  const landscape = new THREE.Group();
  landscape.name = "ARCH_LANDSCAPE";
  landscape.add(box("SITE_GROUND", [70, 0.16, 52], [0, -0.1, 5], materials.ground));
  landscape.add(box("ENTRY_PLAZA", [32, 0.08, 11], [0, 0.02, 12.5], materials.tile));
  landscape.add(box("ENTRY_WALK", [7, 0.085, 16], [0, 0.04, 20], materials.tile));
  landscape.add(box("DROP_OFF_CURB", [32, 0.18, 0.22], [0, 0.12, 7.2], materials.concreteDark));
  landscape.add(box("ENTRY_WALK_EDGE_A", [0.2, 0.12, 16], [-3.6, 0.09, 20], materials.concreteDark));
  landscape.add(box("ENTRY_WALK_EDGE_B", [0.2, 0.12, 16], [3.6, 0.09, 20], materials.concreteDark));
  [-18, -10, 10, 18].forEach((x) => addTree(landscape, x, 15 + Math.abs(x) * 0.12, 1.15));
  [-12, 12].forEach((x) => addStreetLight(landscape, x, 9.5, 1));
  addCar(landscape, -8.3, 10.2, 1.05);
  addCar(landscape, 8.3, 10.2, 1.05);

  scene.add(architecture, landscape);
  return scene;
}

type InteriorKind = "studio" | "one-bedroom" | "two-bedroom";

function createInterior(kind: InteriorKind): THREE.Scene {
  const dimensions: Record<InteriorKind, { width: number; depth: number; bedrooms: number }> = {
    studio: { width: 6.4, depth: 4.6, bedrooms: 0 },
    "one-bedroom": { width: 7.8, depth: 5.6, bedrooms: 1 },
    "two-bedroom": { width: 11, depth: 6.4, bedrooms: 2 },
  };
  const { width, depth, bedrooms } = dimensions[kind];
  const scene = new THREE.Scene();
  scene.name = `${kind} interior`;
  scene.userData = { units: "meters", version: "showcase-vertical-slice-v1", artistVisualization: true };

  const shell = new THREE.Group();
  shell.name = "ROOM_SHELL";
  shell.add(box("FLOOR_WOOD", [width, 0.12, depth], [0, 0, 0], materials.wood));
  shell.add(box("WALL_BACK", [width, 2.7, 0.12], [0, 1.35, -depth / 2], materials.wall));
  shell.add(box("WALL_LEFT", [0.12, 2.7, depth], [-width / 2, 1.35, 0], materials.wall));
  shell.add(box("WALL_RIGHT", [0.12, 2.7, depth], [width / 2, 1.35, 0], materials.wall));
  shell.add(box("WINDOW_FRONT", [width * 0.7, 1.9, 0.05], [0, 1.45, depth / 2], materials.glass));
  shell.add(box("BALCONY", [Math.min(width * 0.62, 4.2), 0.12, 1.4], [0, 0, depth / 2 + 0.7], materials.tile));
  shell.add(box("BALCONY_RAIL", [Math.min(width * 0.62, 4.2), 1, 0.05], [0, 0.55, depth / 2 + 1.4], materials.glass));

  const base = new THREE.Group();
  base.name = "FURN_BASE";
  base.add(box("KITCHEN_COUNTER", [2.4, 0.9, 0.65], [-width / 2 + 1.5, 0.45, -depth / 2 + 0.45], materials.wall));
  base.add(box("KITCHEN_TOP", [2.45, 0.06, 0.7], [-width / 2 + 1.5, 0.93, -depth / 2 + 0.45], materials.concreteDark));
  base.add(box("FRIDGE", [0.75, 1.9, 0.75], [width / 2 - 0.55, 0.95, -depth / 2 + 0.5], materials.metal));

  if (kind === "two-bedroom") {
    shell.add(box("MASTER_PARTITION", [0.14, 2.7, depth * 0.48], [1.45, 1.35, 1.45], materials.wall));
    shell.add(box("SECOND_BED_PARTITION", [0.14, 2.7, depth * 0.45], [1.45, 1.35, -1.75], materials.wall));
    shell.add(box("BATH_PARTITION", [2.35, 2.7, 0.14], [width / 2 - 1.18, 1.35, -0.95], materials.wall));
    shell.add(box("BATH_FLOOR", [2.2, 0.13, 1.75], [width / 2 - 1.2, 0.02, -1.95], materials.tile));
    base.add(box("KITCHEN_RETURN", [0.72, 0.9, 2.4], [-width / 2 + 0.45, 0.45, -0.45], materials.wall));
    base.add(box("KITCHEN_RETURN_TOP", [0.78, 0.06, 2.45], [-width / 2 + 0.45, 0.93, -0.45], materials.stone));
    base.add(box("BATH_VANITY", [0.75, 0.82, 0.48], [width / 2 - 0.5, 0.41, -1.55], materials.darkWood));
    base.add(box("BATH_SINK", [0.68, 0.08, 0.42], [width / 2 - 0.5, 0.86, -1.55], materials.stone));
    base.add(box("SHOWER_BASE", [0.95, 0.08, 0.95], [width / 2 - 1.75, 0.05, -2.35], materials.tile));
    base.add(box("SHOWER_GLASS", [0.95, 1.95, 0.04], [width / 2 - 1.75, 1, -1.9], materials.glass));
    base.add(box("TOILET", [0.48, 0.48, 0.7], [width / 2 - 0.55, 0.24, -2.55], materials.stone));
  }

  const semi = new THREE.Group();
  semi.name = "FURN_SEMI";
  semi.add(box("SOFA_BASE", [2.2, 0.38, 0.95], [-0.8, 0.25, 0.6], materials.fabric));
  semi.add(box("SOFA_BACK", [2.2, 0.7, 0.18], [-0.8, 0.62, 0.2], materials.fabric));
  semi.add(box("DINING_TABLE", [1.4, 0.08, 0.85], [1.25, 0.76, -0.55], materials.wood));
  if (bedrooms === 0) {
    semi.add(box("BED", [1.55, 0.42, 2.05], [width / 2 - 1.2, 0.25, 0.65], materials.fabric));
  } else {
    for (let index = 0; index < bedrooms; index += 1) {
      const bedroomX = width / 2 - 1.25 - index * 2.3;
      semi.add(box(`BED_${index + 1}`, [1.5, 0.42, 2.05], [bedroomX, 0.25, -0.2], materials.fabric));
      semi.add(box(`PARTITION_${index + 1}`, [0.12, 2.7, depth * 0.48], [bedroomX - 1.05, 1.35, -0.4], materials.wall));
      semi.add(box(`HEADBOARD_${index + 1}`, [1.72, 1.05, 0.12], [bedroomX, 0.76, -1.2], materials.darkWood));
    }
  }

  const full = new THREE.Group();
  full.name = "FURN_FULL";
  full.add(box("COFFEE_TABLE", [1.05, 0.38, 0.58], [-0.8, 0.2, 1.45], materials.wood));
  full.add(box("TV_UNIT", [1.8, 0.42, 0.45], [-0.8, 0.22, -depth / 2 + 0.35], materials.concreteDark));
  full.add(box("RUG", [2.5, 0.025, 1.8], [-0.8, 0.07, 0.85], materials.accent));

  if (kind === "two-bedroom") {
    full.add(box("SECTIONAL_RETURN", [0.95, 0.42, 1.8], [-2.45, 0.25, 0.95], materials.linen));
    full.add(box("MEDIA_WALL", [2.7, 2.25, 0.12], [-1.55, 1.25, -depth / 2 + 0.15], materials.darkWood));
    full.add(box("TELEVISION", [1.65, 0.95, 0.06], [-1.55, 1.35, -depth / 2 + 0.24], materials.screen));
    full.add(box("KITCHEN_ISLAND", [2.2, 0.92, 0.92], [-2.2, 0.46, -0.25], materials.stone));
    full.add(box("KITCHEN_ISLAND_TOP", [2.3, 0.07, 1.02], [-2.2, 0.96, -0.25], materials.stone));
    for (const z of [-0.65, 0.15]) {
      full.add(box(`BAR_STOOL_${z}`, [0.42, 0.72, 0.42], [-0.85, 0.36, z], materials.darkWood));
    }
    full.add(box("DINING_PENDANT", [1.4, 0.08, 0.28], [1.25, 2.35, -0.55], materials.brass));
    for (const [x, z] of [[0.65, -1.15], [1.85, -1.15], [0.65, 0.05], [1.85, 0.05]] as const) {
      full.add(box(`DINING_CHAIR_${x}_${z}`, [0.45, 0.82, 0.45], [x, 0.41, z], materials.darkWood));
    }
    full.add(box("MASTER_SIDE_TABLE_A", [0.48, 0.48, 0.48], [width / 2 - 2.25, 0.24, 0.85], materials.darkWood));
    full.add(box("MASTER_SIDE_TABLE_B", [0.48, 0.48, 0.48], [width / 2 - 0.25, 0.24, 0.85], materials.darkWood));
    full.add(box("MASTER_WARDROBE", [2.1, 2.25, 0.62], [width / 2 - 1.15, 1.12, depth / 2 - 0.42], materials.darkWood));
    full.add(box("SECOND_DESK", [1.45, 0.76, 0.58], [width / 2 - 1.2, 0.38, -depth / 2 + 0.52], materials.wood));
    full.add(box("ENTRY_CONSOLE", [1.4, 0.82, 0.4], [0.25, 0.41, -depth / 2 + 0.32], materials.darkWood));

    const plant = new THREE.Group();
    plant.name = "LIVING_PLANT";
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.55, 14), materials.soil);
    pot.position.y = 0.28;
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), materials.foliage);
    leaves.position.y = 0.95;
    leaves.scale.set(0.85, 1.25, 0.85);
    plant.position.set(-width / 2 + 0.55, 0, depth / 2 - 0.55);
    plant.add(pot, leaves);
    full.add(plant);
  }

  const collision = box("COLLISION", [width - 0.45, 1.8, depth - 0.45], [0, 0.9, 0], materials.pick);
  collision.userData = { kind: "collision", walkableBounds: { width: width - 0.45, depth: depth - 0.45 } };

  scene.add(shell, base, semi, full, collision);
  scene.add(empty("CAM_START", [0, 1.6, Math.min(depth * 0.18, 0.8)], { kind: "camera-anchor" }));
  scene.add(empty("HOTSPOT_LIVING", [-0.8, 1.6, 0.7], { title: "Living area" }));
  scene.add(empty("HOTSPOT_KITCHEN", [-width / 2 + 1.5, 1.6, -depth / 2 + 1.2], { title: "Kitchen" }));
  if (bedrooms > 0) scene.add(empty("HOTSPOT_BEDROOM", [width / 2 - 1.2, 1.6, -0.2], { title: "Bedroom" }));
  return scene;
}

async function exportGlb(scene: THREE.Scene, target: string) {
  scene.updateMatrixWorld(true);
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(scene, { binary: true, onlyVisible: false });
  if (!(result instanceof ArrayBuffer)) throw new Error(`Expected a binary GLB for ${target}.`);
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, Buffer.from(result));
}

async function main() {
  await exportGlb(createBuilding(), resolve(BUILDING_OUTPUT_ROOT, "building/vertica-building.glb"));
  await exportGlb(createInterior("studio"), resolve(INTERIOR_OUTPUT_ROOT, "interiors/studio.glb"));
  await exportGlb(createInterior("one-bedroom"), resolve(INTERIOR_OUTPUT_ROOT, "interiors/one-bedroom.glb"));
  await exportGlb(createInterior("two-bedroom"), resolve(INTERIOR_OUTPUT_ROOT, "interiors/two-bedroom.glb"));
}

await main();
