import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

interface GlbJson {
  accessors?: { count?: number }[];
  materials?: unknown[];
  meshes?: { primitives?: { indices?: number; attributes?: { POSITION?: number }; mode?: number }[] }[];
  nodes?: { mesh?: number }[];
}

const targets = [
  {
    label: "building-v2",
    path: resolve("public/models/vertica/v2/building/vertica-building.glb"),
    limits: { bytes: 6_000_000, triangles: 150_000, drawCalls: 150, materials: 12 },
  },
  {
    label: "two-bedroom-v1",
    path: resolve("public/models/vertica/v1/interiors/two-bedroom.glb"),
    limits: { bytes: 4_000_000, triangles: 100_000, drawCalls: 120, materials: 16 },
  },
] as const;

function readJsonChunk(buffer: Buffer): GlbJson {
  if (buffer.toString("utf8", 0, 4) !== "glTF") throw new Error("Not a GLB file.");
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error("GLB JSON chunk is missing.");
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim()) as GlbJson;
}

let failed = false;
for (const target of targets) {
  const buffer = await readFile(target.path);
  const json = readJsonChunk(buffer);
  const accessors = json.accessors ?? [];
  const meshes = json.meshes ?? [];
  const nodes = json.nodes ?? [];
  const drawCalls = nodes.reduce((total, node) => total + (node.mesh === undefined ? 0 : (meshes[node.mesh]?.primitives?.length ?? 0)), 0);
  const triangles = nodes.reduce((total, node) => {
    if (node.mesh === undefined) return total;
    return total + (meshes[node.mesh]?.primitives ?? []).reduce((sum, primitive) => {
      if ((primitive.mode ?? 4) !== 4) return sum;
      const count = primitive.indices === undefined
        ? accessors[primitive.attributes?.POSITION ?? -1]?.count ?? 0
        : accessors[primitive.indices]?.count ?? 0;
      return sum + Math.floor(count / 3);
    }, 0);
  }, 0);
  const metrics = {
    bytes: (await stat(target.path)).size,
    triangles,
    drawCalls,
    materials: json.materials?.length ?? 0,
  };
  const violations = Object.entries(target.limits).filter(([key, limit]) => metrics[key as keyof typeof metrics] > limit);
  process.stdout.write(`${target.label}: ${JSON.stringify(metrics)}${violations.length ? ` FAIL ${violations.map(([key, limit]) => `${key}>${limit}`).join(",")}` : " PASS"}\n`);
  failed ||= violations.length > 0;
}

if (failed) process.exitCode = 1;
