import * as THREE from "three";

/**
 * Shared material palette for the 3D views, keyed to the brand tokens
 * (accent #2a7a4b family). Scene environment colors shift slightly for dark
 * mode; building and furniture materials stay identical so shadows read the
 * same in both schemes.
 */
export const SCENE_ENV = {
  light: { background: 0xe9ede8, fog: 0xe9ede8, ground: 0xcfd8cf, plaza: 0xd8ded6 },
  dark: { background: 0x11150f, fog: 0x11150f, ground: 0x1c211b, plaza: 0x232922 },
} as const;

export const STATUS_COLORS: Record<string, number> = {
  AVAILABLE: 0x2a7a4b,
  OCCUPIED: 0x3778c2,
  RESERVED: 0xd99b32,
  MAINTENANCE: 0xc95d4e,
  UNAVAILABLE: 0x73736c,
  DRAFT: 0x8d94a3,
};

/** Neutral massing color for slots whose occupancy is not publicly listed. */
export const MASSING_COLOR = 0xd3d7cf;

export interface BuildingMaterials {
  concrete: THREE.MeshStandardMaterial;
  concreteDark: THREE.MeshStandardMaterial;
  spandrel: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  mullion: THREE.MeshStandardMaterial;
  rail: THREE.MeshStandardMaterial;
  canopy: THREE.MeshStandardMaterial;
  trunk: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  ground: THREE.MeshStandardMaterial;
  plaza: THREE.MeshStandardMaterial;
  lobby: THREE.MeshStandardMaterial;
  dispose(): void;
}

export function createBuildingMaterials(prefersDark: boolean): BuildingMaterials {
  const materials: THREE.MeshStandardMaterial[] = [];
  const create = (params: THREE.MeshStandardMaterialParameters) => {
    const material = new THREE.MeshStandardMaterial(params);
    materials.push(material);
    return material;
  };
  return {
    concrete: create({ color: prefersDark ? 0x9ba196 : 0xd6d9d2, roughness: 0.85 }),
    concreteDark: create({ color: prefersDark ? 0x6f7469 : 0xb3b7ad, roughness: 0.9 }),
    spandrel: create({ color: prefersDark ? 0x565b52 : 0xa9aea3, roughness: 0.75 }),
    glass: create({ color: 0xa8cede, roughness: 0.15, metalness: 0.35, emissive: 0x6f9fb2, emissiveIntensity: 0.12, transparent: true, opacity: 0.85 }),
    mullion: create({ color: prefersDark ? 0x3d4038 : 0x70746a, roughness: 0.5, metalness: 0.4 }),
    rail: create({ color: 0xb7c4c9, roughness: 0.2, metalness: 0.5, transparent: true, opacity: 0.55 }),
    canopy: create({ color: prefersDark ? 0x3a3f37 : 0x4c5347, roughness: 0.7 }),
    trunk: create({ color: 0x7a6248, roughness: 0.9 }),
    foliage: create({ color: 0x3d7a52, roughness: 0.8 }),
    ground: create({ color: SCENE_ENV[prefersDark ? "dark" : "light"].ground, roughness: 0.95 }),
    plaza: create({ color: SCENE_ENV[prefersDark ? "dark" : "light"].plaza, roughness: 0.9 }),
    lobby: create({ color: 0xcfe6dd, roughness: 0.2, metalness: 0.2, emissive: 0x9fd8bd, emissiveIntensity: 0.35 }),
    dispose() {
      materials.forEach((material) => material.dispose());
    },
  };
}

/** Per-unit material clones (needed so hover/selection/dimming can mutate each unit independently). */
export function createUnitMaterial(status: string | undefined): THREE.MeshStandardMaterial {
  const color = STATUS_COLORS[status ?? "AVAILABLE"] ?? STATUS_COLORS.UNAVAILABLE!;
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  material.emissive.setHex(color);
  material.emissiveIntensity = 0.05;
  return material;
}

export function createMassingMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: MASSING_COLOR, roughness: 0.8 });
  material.emissive.setHex(MASSING_COLOR);
  material.emissiveIntensity = 0.03;
  return material;
}
