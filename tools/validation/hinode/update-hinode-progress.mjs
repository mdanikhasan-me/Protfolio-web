import console from 'node:console';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const evidenceRoot = path.join(root, 'artifacts/hinode');
const reviewRoot = path.join(root, 'public/hinode/review');
const statusPath = path.join(reviewRoot, 'status.json');

const notes = {
  'hinode-top-down.png':
    'Complete authorised 75 m × 60 m slice, road hierarchy, building massing, canal and flyover.',
  'hinode-road-spline-clearance.png':
    'Spline continuity and the intended driveable clearance envelope, shown without beauty-lighting concealment.',
  'hinode-alley-entrance.png':
    'Driver-height approach used to judge vehicle width, shopfront scale and initial driving readability.',
  'hinode-alley-curve.png':
    'Driver-height curve view used to judge sightline, minimum radius and prop exclusion.',
  'hinode-flyover-composition.png':
    'Gameplay-height composition showing whether the elevated road reads from the alley.',
  'hinode-secondary-merge.png':
    'Driver-height T-junction and transition into the wider secondary road.',
  'hinode-side-scale.png':
    'Side elevation comparing road datum, coupe, building modules and seven-metre flyover deck.',
  'hinode-three-quarter-overview.png':
    'Three-quarter review view of the complete authorised slice with temporary neutral fill.',
  'hinode-browser-loaded.png':
    'Initial loaded gameplay state from the real served route in automated Chrome.',
  'hinode-browser-alley.png':
    'Chase-camera evidence at the alley start; automated capture, not manual QA.',
  'hinode-browser-curve.png':
    'Vehicle entering the authored alley curve during deterministic automated input.',
  'hinode-browser-junction.png': 'Vehicle at the T-junction before the secondary-road merge.',
  'hinode-browser-merge.png': 'Vehicle approaching the wider secondary road.',
  'hinode-browser-flyover.png':
    'Gameplay camera evidence of the flyover composition from the intended route.',
  'hinode-browser-secondary.png': 'Vehicle entering the wider secondary road.',
  'hinode-browser-debug.png': 'HUD, controls and renderer metrics captured from the live route.',
  'hinode-browser-font-error.png':
    'Visible Vite/font limitation retained as error evidence rather than hidden.',
};

const titleFromFile = (filename) =>
  filename
    .replace(/^hinode-(?:browser-)?/, '')
    .replace(/\.png$/, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const readJson = async (file, fallback = null) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
};

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

async function collectEvidence(kind, directory, durations = {}) {
  let names;
  try {
    names = (await readdir(directory))
      .filter((name) => name.endsWith('.png'))
      .sort((first, second) => first.localeCompare(second));
  } catch {
    return [];
  }
  return Promise.all(
    names.map(async (name) => {
      const source = path.join(directory, name);
      const destination = path.join(reviewRoot, name);
      const fileStat = await stat(source);
      const metadata = await sharp(source).metadata();
      await copyFile(source, destination);
      return {
        id: name.replace(/\.png$/, ''),
        title: titleFromFile(name),
        url: `/hinode/review/${name}`,
        cacheKey: `${Math.round(fileStat.mtimeMs)}-${fileStat.size}`,
        updatedAt: fileStat.mtime.toISOString(),
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        note: notes[name] ?? `Current ${kind} review evidence.`,
        durationSeconds: durations[name],
      };
    }),
  );
}

await mkdir(reviewRoot, { recursive: true });

const serverState = await readJson(path.join(root, '.astro/dev.json'), {});
const blenderReport = await readJson(
  path.join(evidenceRoot, 'blender/hinode-blender-report.json'),
  {},
);
const staticValidation = await readJson(
  path.join(evidenceRoot, 'validation/hinode-static-validation.json'),
  { totals: {} },
);
const browserMetrics = await readJson(
  path.join(evidenceRoot, 'browser/hinode-browser-metrics.json'),
  {},
);
const durations = Object.fromEntries(
  (blenderReport.renderEvidence ?? []).map((item) => [
    path.basename(item.path),
    item.durationSeconds,
  ]),
);
const blender = await collectEvidence('Blender', path.join(evidenceRoot, 'blender'), durations);
const browser = await collectEvidence('browser', path.join(evidenceRoot, 'browser'));

const manifest = {
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  branch: git('branch', '--show-current'),
  commit: git('rev-parse', '--short=7', 'HEAD'),
  server: {
    status: serverState.pid ? 'running' : 'unknown',
    pid: serverState.pid ?? null,
    port: serverState.port ?? 4321,
    url: serverState.url ?? 'http://localhost:4321',
    startedAt: serverState.startedAt ?? null,
    logPath: path.join(root, '.astro/dev.log'),
  },
  stages: {
    modelling: 'Provisional technical prototype',
    rendering:
      blender.length >= 8
        ? 'Eight fresh review views ready'
        : `${blender.length} review views ready`,
    browser:
      browser.length > 0
        ? `${browser.length} automated browser captures ready`
        : 'Automated browser capture pending',
  },
  metrics: {
    environmentTriangles:
      staticValidation.totals?.environmentTriangles ?? blenderReport.scene?.bakedTriangles ?? 0,
    vehicleTriangles: staticValidation.totals?.vehicleTriangles ?? 0,
    drawCalls: browserMetrics.drawCalls ?? null,
    fps: browserMetrics.fps ?? null,
    gzipBytes: staticValidation.totals?.publicGzipBytes ?? 0,
  },
  evidence: { blender, browser },
  gameplayCapture: browserMetrics.gameplayCapture ?? null,
  defects: {
    visual: [
      'The current art remains a schematic prototype and is not visually approved.',
      'Building silhouettes, signage, prop authorship and material separation remain underdeveloped.',
      'Night lighting must remain readable; previous evidence was too dark and poorly framed.',
      'Japanese identity is communicated mostly through generic module shapes rather than resolved original detail.',
      'Automated browser captures do not replace manual visual review.',
    ],
    gameplay: [
      'Camera clipping and curve readability still require manual driving review.',
      'The complete alley-to-secondary-road merge needs visual verification from the chase camera.',
      'Collision is a continuous road corridor rather than prop-by-prop physical geometry.',
      'The vertical slice remains visually provisional and requires an authored environment pass.',
      'RTX 3070 sustained frame pacing has not been manually benchmarked.',
    ],
  },
};

await writeFile(statusPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Hinode progress manifest updated: ${statusPath}`);
console.log(
  `Evidence: ${manifest.evidence.blender.length} Blender, ${manifest.evidence.browser.length} browser`,
);
