import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const candidateRoot = path.join('public', 'hinode', 'review', 'v2-candidate');
const browserRoot = path.join(candidateRoot, 'browser');
const videoRoot = path.join(candidateRoot, 'videos');
const readJson = async (filePath) =>
  JSON.parse(await fs.readFile(path.join(root, filePath), 'utf8'));

const layout = await readJson('public/hinode/layouts/hinode-city-v2-candidate.json');
const topology = await readJson('public/hinode/layouts/hinode-city-v2-topology.json');
const rejectedV1 = await readJson('public/hinode/layouts/hinode-city-v1.json');
const capture = await readJson(path.join(candidateRoot, 'capture-manifest.json'));

const requiredBrowserFiles = [
  'v2-topology-map.png',
  'v2-road-hierarchy-map.png',
  'v2-elevation-map.png',
  'v2-road-edge-map.png',
  'v2-safety-map.png',
  'v2-flyover-elevation.png',
  'v2-underpass-section.png',
  'v2-district-density-map.png',
  'v2-driver-main-loop.png',
  'v2-driver-secondary.png',
  'v2-driver-alley.png',
  'v2-driver-touge.png',
  'v2-driver-waterfront.png',
  'v2-driver-flyover-approach.png',
  'v2-driver-flyover-lower.png',
  'v2-driver-underpass-entrance.png',
  'v2-editor-collision.png',
  'v2-performance-city.png',
  'v2-reference-comparison.png',
];
const requiredVideoFiles = ['v2-candidate-route-review.webm'];
const requiredFiles = [
  ...requiredBrowserFiles.map((file) => path.join(browserRoot, file)),
  ...requiredVideoFiles.map((file) => path.join(videoRoot, file)),
];
const evidence = [];
for (const relativePath of requiredFiles) {
  const file = await fs.stat(path.join(root, relativePath));
  evidence.push({
    path: relativePath.replaceAll('\\', '/'),
    bytes: file.size,
    present: file.isFile() && file.size > 0,
  });
}

const failures = [];
if (layout.status !== 'candidate_awaiting_user_approval') {
  failures.push('v2 status changed from candidate_awaiting_user_approval');
}
if (layout.layoutId !== 'HINODE_CITY_V2_CANDIDATE') {
  failures.push('v2 candidate layoutId is incorrect');
}
if (topology.status !== 'candidate_awaiting_user_approval') {
  failures.push('v2 topology status is incorrect');
}
if (rejectedV1.status !== 'rejected_visual_layout') {
  failures.push('v1 is not marked rejected_visual_layout');
}
if (capture.candidateLayout !== '/hinode/layouts/hinode-city-v2-candidate.json') {
  failures.push('capture manifest is not tied to v2 candidate');
}
if (evidence.some((item) => !item.present)) failures.push('candidate evidence is missing or empty');

const performance = capture.metrics['v2-performance-city'] ?? {};
const status = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'candidate_awaiting_user_approval',
  validation: {
    valid: failures.length === 0,
    failures,
    automatedChecksDoNotApproveVisualDesign: true,
  },
  layout: {
    layoutId: layout.layoutId,
    topologyId: layout.topologyId,
    widthMetres: layout.bounds.width,
    depthMetres: layout.bounds.depth,
    roadCount: layout.roads.length,
    networkLengthMetres: Number(performance.networkLength ?? 3906),
  },
  v1: {
    layoutId: rejectedV1.layoutId,
    status: rejectedV1.status,
    retained: true,
    loadedByDefault: false,
  },
  handling: 'promising_but_requires_manual_tuning',
  performance: {
    captureMode: 'headless Chrome diagnostic, not a hardware benchmark',
    quality: performance.quality,
    fps: Number(performance.fps),
    drawCalls: Number(performance.drawCalls),
    triangles: Number(performance.triangles),
    physicsHz: Number(performance.physicsHz),
  },
  evidence,
  videoDisclosure:
    'Deterministic candidate viewpoint sweep; not represented as a continuous driven lap.',
};

await fs.writeFile(
  path.join(root, candidateRoot, 'status.json'),
  `${JSON.stringify(status, null, 2)}\n`,
);
globalThis.console.log(JSON.stringify(status, null, 2));
if (failures.length) process.exitCode = 1;
