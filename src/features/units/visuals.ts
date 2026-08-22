import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { getPublicUnitByLabel, listPublicUnits } from "@/features/units/queries";

const VISUAL_BUCKET = "visual-media";

interface StoredModelRow {
  id: string;
  model_version: string;
  glb_path: string;
  poster_path: string | null;
  byte_size: number | null;
  checksum: string | null;
  rights_note: string | null;
  performance_note: string | null;
}

interface UnitModelRow extends StoredModelRow {
  collision_mesh_id: string | null;
  camera_anchor: Record<string, unknown> | null;
  hotspots: unknown[] | null;
  variants: Record<string, unknown> | null;
}

interface FloorPlanVisualRow {
  id: string;
  storage_path: string;
  width_px: number | null;
  height_px: number | null;
  version: string | null;
  accessibility_description: string | null;
  created_at: string;
}

interface PanoramaTourVisualRow {
  id: string;
  poster_path: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PublicModelAsset {
  version: string;
  glbUrl: string;
  posterUrl: string | null;
  byteSize: number | null;
  checksum: string | null;
  rightsNote: string | null;
  performanceNote: string | null;
}

export interface PublicBuildingVisualManifest {
  building: { id: string; name: string } | null;
  model: PublicModelAsset | null;
  unitAnchors: {
    publicLabel: string;
    meshId: string | null;
    position: Record<string, unknown> | null;
    rotation: Record<string, unknown> | null;
    scale: Record<string, unknown> | null;
  }[];
}

export interface PublicUnitVisualManifest {
  publicLabel: string;
  model: (PublicModelAsset & {
    collisionMeshId: string | null;
    cameraAnchor: Record<string, unknown> | null;
    hotspots: unknown[];
    variants: Record<string, unknown>;
  }) | null;
  floorPlan: {
    url: string;
    width: number | null;
    height: number | null;
    version: string | null;
    accessibilityDescription: string | null;
  } | null;
  panorama: {
    posterUrl: string | null;
    scenes: {
      title: string | null;
      imageUrl: string;
      order: number;
      initialCamera: Record<string, unknown> | null;
      hotspots: unknown[];
    }[];
  } | null;
}

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function publicVisualUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (isAbsoluteUrl(path) || path.startsWith("/")) return path;
  const supabase = createServiceRoleClient();
  return supabase.storage.from(VISUAL_BUCKET).getPublicUrl(path).data.publicUrl;
}

function publicModel(row: StoredModelRow): PublicModelAsset {
  return {
    version: row.model_version,
    glbUrl: publicVisualUrl(row.glb_path)!,
    posterUrl: publicVisualUrl(row.poster_path),
    byteSize: row.byte_size === null ? null : Number(row.byte_size),
    checksum: row.checksum,
    rightsNote: row.rights_note,
    performanceNote: row.performance_note,
  };
}

function missingOptionalVisualTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /unit_models/i.test(error.message ?? "");
}

export async function getPublicBuildingVisualManifest(): Promise<PublicBuildingVisualManifest> {
  const supabase = createServiceRoleClient();
  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("id, name")
    .eq("status", "ACTIVE")
    .order("name")
    .limit(1)
    .maybeSingle();
  if (buildingError) throw new Error("Could not load the building visual manifest.");
  if (!building) return { building: null, model: null, unitAnchors: [] };

  const { data: model, error: modelError } = await supabase
    .from("building_models")
    .select("id, model_version, glb_path, poster_path, byte_size, checksum, rights_note, performance_note")
    .eq("building_id", building.id)
    .eq("is_active", true)
    .maybeSingle();
  if (modelError) throw new Error("Could not load the active building model.");
  if (!model) return { building, model: null, unitAnchors: [] };

  const [availableUnits, positionsResult] = await Promise.all([
    listPublicUnits({ limit: 200 }),
    supabase
      .from("unit_visual_positions")
      .select("unit_id, position, rotation, scale, mesh_id")
      .eq("building_model_id", model.id),
  ]);
  if (positionsResult.error) throw new Error("Could not load the building unit positions.");
  const availableById = new Map(availableUnits.map((unit) => [unit.id, unit]));

  return {
    building,
    model: publicModel(model as StoredModelRow),
    unitAnchors: (positionsResult.data ?? [])
      .map((position) => {
        const unit = availableById.get(position.unit_id);
        if (!unit) return null;
        return {
          publicLabel: unit.publicLabel,
          meshId: position.mesh_id,
          position: position.position as Record<string, unknown> | null,
          rotation: position.rotation as Record<string, unknown> | null,
          scale: position.scale as Record<string, unknown> | null,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null),
  };
}

export async function getPublicUnitVisualManifest(publicLabel: string): Promise<PublicUnitVisualManifest | null> {
  const unit = await getPublicUnitByLabel(publicLabel);
  if (!unit) return null;
  const supabase = createServiceRoleClient();

  const findUnitModel = async () => {
    const override = await supabase
      .from("unit_models")
      .select("id, model_version, glb_path, poster_path, collision_mesh_id, camera_anchor, hotspots, variants, byte_size, checksum, rights_note, performance_note")
      .eq("unit_id", unit.id)
      .eq("is_active", true)
      .maybeSingle();
    if (override.error && !missingOptionalVisualTable(override.error)) throw new Error("Could not load the unit model.");
    if (override.data) return override.data as UnitModelRow;
    const byType = await supabase
      .from("unit_models")
      .select("id, model_version, glb_path, poster_path, collision_mesh_id, camera_anchor, hotspots, variants, byte_size, checksum, rights_note, performance_note")
      .eq("unit_type_id", unit.unitTypeId!)
      .eq("is_active", true)
      .maybeSingle();
    if (byType.error && !missingOptionalVisualTable(byType.error)) throw new Error("Could not load the unit-type model.");
    return (byType.data as UnitModelRow | null) ?? null;
  };

  const findTargetedRow = async <Row>(
    table: "floor_plans" | "panorama_tours",
    columns: string,
  ): Promise<Row | null> => {
    const override = await supabase.from(table).select(columns).eq("unit_id", unit.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (override.error) throw new Error(`Could not load ${table.replaceAll("_", " ")}.`);
    if (override.data) return override.data as unknown as Row;
    const byType = await supabase.from(table).select(columns).eq("unit_type_id", unit.unitTypeId!).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (byType.error) throw new Error(`Could not load ${table.replaceAll("_", " ")}.`);
    return (byType.data as unknown as Row | null) ?? null;
  };

  const [model, floorPlan, tour] = await Promise.all([
    findUnitModel(),
    findTargetedRow<FloorPlanVisualRow>("floor_plans", "id, storage_path, width_px, height_px, version, accessibility_description, created_at"),
    findTargetedRow<PanoramaTourVisualRow>("panorama_tours", "id, poster_path, is_active, created_at"),
  ]);

  let panorama: PublicUnitVisualManifest["panorama"] = null;
  if (tour?.id && tour.is_active) {
    const scenesResult = await supabase
      .from("panorama_scenes")
      .select("title, image_path, scene_order, initial_camera, hotspots")
      .eq("tour_id", tour.id)
      .order("scene_order");
    if (scenesResult.error) throw new Error("Could not load the panorama scenes.");
    panorama = {
      posterUrl: publicVisualUrl(tour.poster_path),
      scenes: (scenesResult.data ?? []).map((scene) => ({
        title: scene.title,
        imageUrl: publicVisualUrl(scene.image_path)!,
        order: scene.scene_order,
        initialCamera: scene.initial_camera as Record<string, unknown> | null,
        hotspots: Array.isArray(scene.hotspots) ? scene.hotspots : [],
      })),
    };
  }

  return {
    publicLabel: unit.publicLabel,
    model: model
      ? {
          ...publicModel(model),
          collisionMeshId: model.collision_mesh_id,
          cameraAnchor: model.camera_anchor,
          hotspots: Array.isArray(model.hotspots) ? model.hotspots : [],
          variants: model.variants ?? {},
        }
      : null,
    floorPlan: floorPlan
      ? {
          url: publicVisualUrl(floorPlan.storage_path)!,
          width: floorPlan.width_px,
          height: floorPlan.height_px,
          version: floorPlan.version,
          accessibilityDescription: floorPlan.accessibility_description,
        }
      : null,
    panorama,
  };
}
