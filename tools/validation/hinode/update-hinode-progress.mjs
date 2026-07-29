import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const reviewRoot = path.join(root, 'public', 'hinode', 'review');
const statusPath = path.join(reviewRoot, 'status.json');

const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

const overlayEvidence = [
  'road-width',
  'footpaths',
  'parcels',
  'vegetation',
  'signs',
  'collision',
  'sightlines',
].map((name) => `public/hinode/review/browser/overlay-${name}.png`);
const reviewEvidence = [
  'district-touge',
  'district-alley',
  'district-downtown',
  'district-port',
  'district-waterfront',
  'feature-flyover',
  'feature-underpass',
].flatMap((name) =>
  ['driver', 'chase'].map((view) => `public/hinode/review/browser/${name}-${view}.png`),
);
const requiredEvidence = [
  'public/hinode/review/browser/handling-low-ready.png',
  'public/hinode/review/browser/handling-high-driving.png',
  'public/hinode/review/browser/editor-isometric.png',
  'public/hinode/review/browser/editor-top.png',
  'public/hinode/review/browser/city-high-ready.png',
  'public/hinode/review/browser/city-high-driving.png',
  'public/hinode/review/browser/city-low-driving.png',
  ...overlayEvidence,
  ...reviewEvidence,
  'public/hinode/review/videos/handling-lab-current.webm',
  'public/hinode/review/videos/hinode-city-current.webm',
  'public/hinode/review/videos/hinode-map-route-overview.webm',
  'public/hinode/review/r34/front-three-quarter.png',
  'public/hinode/review/r34/front.png',
  'public/hinode/review/r34/side.png',
  'public/hinode/review/r34/rear-three-quarter.png',
  'public/hinode/review/r34/rear.png',
  'public/hinode/review/r34/wheel-pivots.png',
];
const vehicleModelPaths = [
  'public/hinode/models/vehicles/mah-nightline-r34.glb',
  'public/hinode/models/vehicles/mah-nightline-r34-lod1.glb',
  'public/hinode/models/vehicles/mah-nightline-r34-lod2.glb',
];

await Promise.all(
  [...requiredEvidence, ...vehicleModelPaths].map((relativePath) =>
    access(path.join(root, relativePath)),
  ),
);

const [capture, vehicle, layout, server] = await Promise.all([
  readJson('public/hinode/review/browser/capture-manifest.json'),
  readJson('docs/hinode/mah-nightline-r34-manifest.json'),
  readJson('public/hinode/layouts/hinode-city-v1.json'),
  readJson('.astro/dev.json'),
]);

const evidenceBytes = Object.fromEntries(
  await Promise.all(
    requiredEvidence.map(async (relativePath) => [
      relativePath.replaceAll('\\', '/'),
      (await stat(path.join(root, relativePath))).size,
    ]),
  ),
);

const metric = (name) => {
  const value = capture.metrics?.[name];
  if (!value) throw new Error(`Capture manifest is missing ${name}.`);
  return value;
};

const vehicleBuffers = await Promise.all(
  vehicleModelPaths.map((relativePath) => readFile(path.join(root, relativePath))),
);
const gitStatus = execFileSync('git', ['status', '--short'], {
  cwd: root,
  encoding: 'utf8',
})
  .trimEnd()
  .split(/\r?\n/)
  .filter(Boolean);

const status = {
  schemaVersion: 2,
  updatedAt: capture.capturedAt,
  packageStatus: 'checkpoint-4-road-first-approval-package',
  branch: git('branch', '--show-current'),
  head: git('rev-parse', '--short=12', 'HEAD'),
  git: {
    dirtyEntries: gitStatus.length,
    stagedEntries: gitStatus.filter((line) => line[0] !== ' ' && line[0] !== '?').length,
    trackedChanges: gitStatus.filter((line) => !line.startsWith('??')).length,
    untrackedEntries: gitStatus.filter((line) => line.startsWith('??')).length,
    status: gitStatus,
  },
  server: {
    status: 'running',
    pid: server.pid,
    port: server.port,
    url: server.url,
    startedAt: server.startedAt,
  },
  layout: {
    layoutId: layout.layoutId,
    status: layout.status,
    widthMetres: layout.bounds.width,
    depthMetres: layout.bounds.depth,
    roadCount: layout.roads.length,
    districtCount: layout.districts.length,
    networkLengthMetres: Number(metric('editor-isometric').networkLength),
    targetLapSeconds: layout.gameplay.targetLapSeconds,
  },
  vehicle: {
    assetId: vehicle.assetId,
    runtimeIdentity: vehicle.runtimeIdentity,
    sourceTriangles: vehicle.source.sourceGeometryTriangles,
    sourceUnchanged: vehicle.source.unchanged,
    sourceSha256: vehicle.source.sha256After,
    dimensionsMetres: vehicle.derivative.dimensionsMetres,
    lods: vehicle.lods,
    rights: vehicle.rights,
  },
  runtime: {
    browser: capture.browser,
    handlingHigh: metric('handling-high-driving'),
    editorHigh: metric('editor-isometric'),
    cityHigh: metric('city-high-driving'),
    cityLow: metric('city-low-driving'),
  },
  payload: {
    vehicleRawBytes: vehicleBuffers.reduce((total, buffer) => total + buffer.byteLength, 0),
    vehicleGzipBytes: vehicleBuffers.reduce(
      (total, buffer) => total + gzipSync(buffer).byteLength,
      0,
    ),
    evidenceBytes: Object.values(evidenceBytes).reduce((total, bytes) => total + bytes, 0),
  },
  evidence: {
    requiredFiles: requiredEvidence,
    bytes: evidenceBytes,
    browserScreenshots: requiredEvidence.filter((item) => item.includes('/browser/')),
    videos: requiredEvidence.filter((item) => item.includes('/videos/')),
    vehicleRenders: requiredEvidence.filter((item) => item.includes('/r34/')),
  },
  scope: {
    completeForCheckpoint: [
      'attributed MAH Nightline derivative with three LODs',
      '120 Hz Rapier handling laboratory',
      'authoritative browser layout editor',
      '500 x 350 metre road-first city proposal',
      'nine named roads including flyover, underpass and two shortcuts',
      'high and low runtime presets',
      'current automated Chrome screenshots and video recordings',
    ],
    deliberatelyProxyOnly: [
      'buildings and skyline',
      'vegetation zones',
      'sign zones and future props',
      'final environment materials and lighting',
    ],
    evidenceLimits: [
      'Chrome capture is automated rather than a manual driving session.',
      'Headless FPS is a diagnostic ceiling, not an RTX 3070 benchmark.',
      'Handling values remain approval-stage tuning rather than final production tuning.',
      'The city is a complete road-first proposal, not final environment art.',
    ],
  },
};

await mkdir(reviewRoot, { recursive: true });
await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');

globalThis.console.log(`Hinode Checkpoint 4 status updated: ${statusPath}`);
globalThis.console.log(
  `${status.evidence.requiredFiles.length} evidence files verified; ${status.layout.roadCount} roads; ${status.layout.networkLengthMetres.toFixed(1)} m network.`,
);
