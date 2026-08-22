import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const OUTPUT_ROOT = resolve("public/models/vertica/v2");

const assets = [
  ["materials/plaster/plaster-color.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plastered_wall_02/plastered_wall_02_diff_1k.jpg"],
  ["materials/plaster/plaster-normal.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plastered_wall_02/plastered_wall_02_nor_gl_1k.jpg"],
  ["materials/plaster/plaster-roughness.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/plastered_wall_02/plastered_wall_02_rough_1k.jpg"],
  ["materials/concrete/concrete-color.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brushed_concrete/brushed_concrete_diff_1k.jpg"],
  ["materials/concrete/concrete-normal.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brushed_concrete/brushed_concrete_nor_gl_1k.jpg"],
  ["materials/concrete/concrete-roughness.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brushed_concrete/brushed_concrete_rough_1k.jpg"],
  ["materials/pavers/pavers-color.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_pavers/stone_pavers_diff_1k.jpg"],
  ["materials/pavers/pavers-normal.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_pavers/stone_pavers_nor_gl_1k.jpg"],
  ["materials/pavers/pavers-roughness.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_pavers/stone_pavers_rough_1k.jpg"],
  ["materials/oak/oak-color.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/oak_wood_planks/oak_wood_planks_diff_1k.jpg"],
  ["materials/oak/oak-normal.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/oak_wood_planks/oak_wood_planks_nor_gl_1k.jpg"],
  ["materials/oak/oak-roughness.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/oak_wood_planks/oak_wood_planks_rough_1k.jpg"],
  ["materials/linen/linen-color.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rough_linen/rough_linen_diff_1k.jpg"],
  ["materials/linen/linen-normal.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rough_linen/rough_linen_nor_gl_1k.jpg"],
  ["materials/linen/linen-roughness.jpg", "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rough_linen/rough_linen_rough_1k.jpg"],
  ["environment/evening-museum-courtyard-1k.hdr", "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/evening_museum_courtyard_1k.hdr"],
] as const;

async function download(relativePath: string, url: string) {
  const target = resolve(OUTPUT_ROOT, relativePath);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  process.stdout.write(`Downloaded ${relativePath}\n`);
}

await Promise.all(assets.map(([path, url]) => download(path, url)));
