import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const baseURL = process.env.HINODE_BASE_URL ?? 'http://localhost:4321';
const candidateRoot = path.resolve('public', 'hinode', 'review', 'v2-candidate');
const browserRoot = path.join(candidateRoot, 'browser');
const videoRoot = path.join(candidateRoot, 'videos');
const temporaryVideoRoot = path.join(candidateRoot, '.capture');
await fs.mkdir(browserRoot, { recursive: true });
await fs.mkdir(videoRoot, { recursive: true });
await fs.mkdir(temporaryVideoRoot, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const captures = [];
const metrics = {};

const ready = async (page, selector) => {
  await page.locator(selector).waitFor({ state: 'attached' });
  await page.waitForFunction(
    (rootSelector) =>
      globalThis.document.querySelector(rootSelector)?.getAttribute('data-phase') === 'ready',
    selector,
    { timeout: 30_000 },
  );
};

const captureRuntime = async ({
  name,
  route,
  rootSelector,
  camera,
  start = false,
  viewport = { width: 1440, height: 900 },
}) => {
  const context = await browser.newContext({ viewport, colorScheme: 'dark' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
  await ready(page, rootSelector);
  if (camera) await page.locator(`[data-camera="${camera}"]`).click();
  if (start) {
    await page.locator('[data-start-drive]').click();
    await page.waitForTimeout(600);
  }
  const screenshotPath = path.join(browserRoot, `${name}.png`);
  await page.screenshot({ path: screenshotPath });
  const dataset = await page.locator(rootSelector).evaluate((element) => ({
    ...element.dataset,
  }));
  if (errors.length) throw new Error(`${name}: ${errors.join(' | ')}`);
  captures.push({ name, route, screenshotPath, dataset, pageErrors: errors });
  metrics[name] = dataset;
  await context.close();
};

const captureEvidencePanel = async ({ name, selector }) => {
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1000 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseURL}/play/hinode-v2-evidence/`, {
    waitUntil: 'networkidle',
  });
  const panel = page.locator(selector);
  await panel.waitFor({ state: 'visible' });
  const screenshotPath = path.join(browserRoot, `${name}.png`);
  await panel.screenshot({ path: screenshotPath });
  if (errors.length) throw new Error(`${name}: ${errors.join(' | ')}`);
  captures.push({
    name,
    route: '/play/hinode-v2-evidence/',
    screenshotPath,
    pageErrors: errors,
  });
  await context.close();
};

const evidencePanels = [
  ['v2-topology-map', '.map-grid > article:nth-child(1)'],
  ['v2-road-hierarchy-map', '.map-grid > article:nth-child(2)'],
  ['v2-elevation-map', '.map-grid > article:nth-child(3)'],
  ['v2-district-density-map', '.map-grid > article:nth-child(4)'],
  ['v2-road-edge-map', '.map-grid > article:nth-child(5)'],
  ['v2-safety-map', '.map-grid > article:nth-child(6)'],
  ['v2-flyover-elevation', '.map-grid > article:nth-child(7)'],
  ['v2-underpass-section', '.map-grid > article:nth-child(8)'],
  ['v2-reference-comparison', '.reference-section'],
];
for (const [name, selector] of evidencePanels) {
  await captureEvidencePanel({ name, selector });
}

for (const overlay of [
  'topology',
  'road-hierarchy',
  'elevation',
  'road-edges',
  'safety',
  'district-density',
  'collision',
]) {
  await captureRuntime({
    name: `v2-editor-${overlay}`,
    route: `/play/hinode-editor/?quality=low&overlay=${overlay}`,
    rootSelector: '[data-hinode-editor]',
    camera: 'top',
  });
}

const views = [
  ['main-loop-v2', 'v2-driver-main-loop'],
  ['secondary-v2', 'v2-driver-secondary'],
  ['alley-v2', 'v2-driver-alley'],
  ['touge-v2', 'v2-driver-touge'],
  ['waterfront-v2', 'v2-driver-waterfront'],
  ['port-v2', 'v2-driver-port'],
  ['flyover-approach-v2', 'v2-driver-flyover-approach'],
  ['flyover-lower-v2', 'v2-driver-flyover-lower'],
  ['underpass-entrance-v2', 'v2-driver-underpass-entrance'],
];
for (const [reviewId, name] of views) {
  await captureRuntime({
    name,
    route: `/play/hinode-city/?quality=low&review=${reviewId}&view=driver`,
    rootSelector: '[data-hinode-city]',
    start: true,
    viewport: { width: 1280, height: 720 },
  });
}
await captureRuntime({
  name: 'v2-performance-city',
  route: '/play/hinode-city/?quality=low',
  rootSelector: '[data-hinode-city]',
  start: true,
  viewport: { width: 1280, height: 720 },
});

const recordRouteReviewSweep = async () => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark',
    recordVideo: {
      dir: temporaryVideoRoot,
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();
  const video = page.video();
  for (const [reviewId] of views) {
    await page.goto(`${baseURL}/play/hinode-city/?quality=low&review=${reviewId}&view=driver`, {
      waitUntil: 'domcontentloaded',
    });
    await ready(page, '[data-hinode-city]');
    await page.locator('[data-start-drive]').click();
    await page.waitForTimeout(1_150);
  }
  await page.close();
  await context.close();
  const temporaryPath = await video.path();
  const finalPath = path.join(videoRoot, 'v2-candidate-route-review.webm');
  await fs.copyFile(temporaryPath, finalPath);
  captures.push({
    name: 'v2-candidate-route-review',
    route: '/play/hinode-city/',
    videoPath: finalPath,
    evidenceMode:
      'deterministic candidate viewpoint sweep; not represented as a continuous driven lap',
  });
};

await recordRouteReviewSweep();
await browser.close();
await fs.rm(temporaryVideoRoot, { recursive: true, force: true });

const manifest = {
  schemaVersion: 1,
  candidateStatus: 'candidate_awaiting_user_approval',
  capturedAt: new Date().toISOString(),
  baseURL,
  browser: 'installed Google Chrome via Playwright',
  candidateLayout: '/hinode/layouts/hinode-city-v2-candidate.json',
  rejectedLayoutExcluded: '/hinode/layouts/hinode-city-v1.json',
  captures,
  metrics,
};
await fs.writeFile(
  path.join(candidateRoot, 'capture-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
globalThis.console.log(
  JSON.stringify(
    {
      candidateRoot,
      captures: captures.length,
      videoCount: captures.filter((capture) => capture.videoPath).length,
      metrics: Object.keys(metrics).length,
    },
    null,
    2,
  ),
);
