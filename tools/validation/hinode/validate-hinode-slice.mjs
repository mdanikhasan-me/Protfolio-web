import { gzipSync } from 'node:zlib';
import console from 'node:console';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const outputPath = path.join(root, 'artifacts/hinode/validation/hinode-static-validation.json');
const checks = [];

const record = (name, passed, details) => {
  checks.push({ name, passed, details });
  if (!passed) process.exitCode = 1;
};

const requireCheck = (condition, name, details) => {
  record(name, Boolean(condition), details);
  return condition;
};

const relative = (absolute) => path.relative(root, absolute).replaceAll('\\', '/');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(absolute) : [absolute];
    }),
  );
  return nested.flat();
}

function parseGlb(buffer, label) {
  if (buffer.length < 20) throw new Error(`${label} is shorter than a GLB header`);
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error(`${label} has an invalid magic value`);
  if (buffer.readUInt32LE(4) !== 2) throw new Error(`${label} is not glTF 2.0`);
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error(`${label} has a length mismatch`);
  const jsonLength = buffer.readUInt32LE(12);
  if (buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`${label} has no JSON chunk`);
  const json = JSON.parse(
    buffer
      .subarray(20, 20 + jsonLength)
      .toString('utf8')
      .trim(),
  );
  const names = (json.nodes ?? []).map((node) => node.name).filter(Boolean);
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if ((primitive.mode ?? 4) !== 4) continue;
      const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
      const count = json.accessors?.[accessorIndex]?.count ?? 0;
      triangles += Math.floor(count / 3);
    }
  }
  return { json, names, triangles };
}

const requiredFiles = [
  'art/blender/hinode/hinode_slice_master.blend',
  'art/blender/hinode/hinode_slice_roads.blend',
  'art/blender/hinode/hinode_slice_buildings.blend',
  'art/blender/hinode/hinode_slice_props.blend',
  'art/blender/hinode/hinode_slice_car.blend',
  'art/blender/hinode/hinode_slice_export.blend',
  'art/references/hinode/hinode-overview-map.png',
  'art/references/hinode/hinode-road-hierarchy.png',
  'art/references/hinode/hinode-alley-modules.png',
  'art/references/hinode/hinode-alley-driving.png',
  'public/hinode/models/hinode-slice-environment.glb',
  'public/hinode/models/hinode-fictional-coupe.glb',
  'public/hinode/textures/hinode-static-light-ao.png',
  'src/pages/play/hinode-preview/index.astro',
];
const missingFiles = requiredFiles.filter((item) => !existsSync(path.join(root, item)));
requireCheck(missingFiles.length === 0, 'required clean-room files exist', { missingFiles });

const forbiddenPaths = [
  '.local-validation/direct-city-review',
  '.local-validation/v4/blender/phase-runner',
  '.local-validation/v4/blender/sources',
  '.local-validation/v4/game-boundary-qa',
  '.local-validation/v4/direct-city-review',
  'tools/blender/phase-runner',
  'tools/blender/state-chamber',
  'tools/blender/checkpoint2_system_studies.py',
];
const presentForbiddenPaths = forbiddenPaths.filter((item) => existsSync(path.join(root, item)));
requireCheck(presentForbiddenPaths.length === 0, 'rejected game paths remain absent', {
  presentForbiddenPaths,
});

const sourceRoots = [
  'src/hinode',
  'src/pages/play/hinode-preview',
  'tools/blender/hinode',
  'tools/validation/hinode',
  'tests/unit/hinode',
  'tests/e2e/hinode',
].map((item) => path.join(root, item));
const sourceFiles = (await Promise.all(sourceRoots.map(walk)))
  .flat()
  .filter(
    (file) =>
      /\.(astro|js|mjs|ts|py)$/.test(file) &&
      path.resolve(file) !== path.resolve(fileURLToPath(import.meta.url)),
  );
const forbiddenTokens = [
  /midnight loop/i,
  /checkpoint2_system_studies/i,
  /phase-runner/i,
  /state-chamber/i,
  /v5-play/i,
  /hinode-web-racer/i,
  /direct-city-review/i,
];
const contaminatedFiles = [];
for (const file of sourceFiles) {
  const contents = await readFile(file, 'utf8');
  const matches = forbiddenTokens.filter((token) => token.test(contents)).map(String);
  if (matches.length > 0) contaminatedFiles.push({ file: relative(file), matches });
}
requireCheck(contaminatedFiles.length === 0, 'new implementation has no rejected-game imports', {
  contaminatedFiles,
});

const manifestPath = path.join(root, 'art/blender/hinode/hinode_slice_manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
requireCheck(
  manifest.cleanRoom === true &&
    manifest.boundaryMetres.x[1] - manifest.boundaryMetres.x[0] === 75 &&
    manifest.boundaryMetres.z[1] - manifest.boundaryMetres.z[0] === 60,
  'manifest declares the authorised 75 m by 60 m clean-room slice',
  { cleanRoom: manifest.cleanRoom, boundaryMetres: manifest.boundaryMetres },
);
requireCheck(
  manifest.roadContracts.alleyWidthMetres === 3.2 &&
    manifest.roadContracts.secondaryWidthMetres === 6.6 &&
    manifest.roadContracts.flyoverDeckMetres >= 6 &&
    manifest.roadContracts.flyoverDeckMetres <= 7.5,
  'road widths and flyover height match the spatial contract',
  manifest.roadContracts,
);
requireCheck(
  manifest.scene.buildingModules >= 6 && manifest.scene.buildingModules <= 8,
  'building module count stays within the approved slice',
  { buildingModules: manifest.scene.buildingModules },
);
requireCheck(
  manifest.scene.bakedTriangles < 180_000,
  'Blender environment triangles stay below budget',
  { triangles: manifest.scene.bakedTriangles, budget: 180_000 },
);

const environmentBuffer = await readFile(
  path.join(root, 'public/hinode/models/hinode-slice-environment.glb'),
);
const vehicleBuffer = await readFile(
  path.join(root, 'public/hinode/models/hinode-fictional-coupe.glb'),
);
const environmentGlb = parseGlb(environmentBuffer, 'environment GLB');
const vehicleGlb = parseGlb(vehicleBuffer, 'vehicle GLB');
requireCheck(
  environmentGlb.triangles === manifest.scene.bakedTriangles,
  'environment GLB triangle count agrees with Blender',
  { glbTriangles: environmentGlb.triangles, blenderTriangles: manifest.scene.bakedTriangles },
);
const vehicleNodes = new Set(vehicleGlb.names);
const requiredVehicleNodes = [
  'VEHICLE_ROOT',
  'WHEEL_FL',
  'WHEEL_FR',
  'WHEEL_RL',
  'WHEEL_RR',
  'HEADLIGHT_L',
  'HEADLIGHT_R',
  'BRAKE_LIGHT_L',
  'BRAKE_LIGHT_R',
];
const missingVehicleNodes = requiredVehicleNodes.filter((node) => !vehicleNodes.has(node));
requireCheck(missingVehicleNodes.length === 0, 'vehicle GLB exposes required runtime nodes', {
  missingVehicleNodes,
  triangles: vehicleGlb.triangles,
});

const publicFiles = (await walk(path.join(root, 'public/hinode'))).filter(
  (file) => path.basename(file) !== '.gitkeep',
);
const payloadFiles = [];
let rawBytes = 0;
let gzipBytes = 0;
for (const file of publicFiles) {
  const bytes = await readFile(file);
  const gzipLength = gzipSync(bytes, { level: 9 }).length;
  rawBytes += bytes.length;
  gzipBytes += gzipLength;
  payloadFiles.push({ path: relative(file), rawBytes: bytes.length, gzipBytes: gzipLength });
}
requireCheck(gzipBytes < 12 * 1024 * 1024, 'compressed public Hinode payload stays below 12 MB', {
  rawBytes,
  gzipBytes,
  budgetBytes: 12 * 1024 * 1024,
  files: payloadFiles,
});

const blendFiles = requiredFiles.filter((item) => item.endsWith('.blend'));
const blendBytes = Object.fromEntries(
  await Promise.all(
    blendFiles.map(async (item) => [item, (await stat(path.join(root, item))).size]),
  ),
);
requireCheck(
  Object.values(blendBytes).every((size) => size > 32_000),
  'all six Blender source stages are substantive files',
  blendBytes,
);

const report = {
  generatedAt: new Date().toISOString(),
  branch: 'rebuild/hinode-from-zero',
  checks,
  totals: {
    passed: checks.filter((check) => check.passed).length,
    failed: checks.filter((check) => !check.passed).length,
    environmentTriangles: environmentGlb.triangles,
    vehicleTriangles: vehicleGlb.triangles,
    publicRawBytes: rawBytes,
    publicGzipBytes: gzipBytes,
  },
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

if (process.exitCode) {
  throw new Error(`Hinode static validation failed; see ${relative(outputPath)}`);
}
