import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const baseURL = process.env.HINODE_BASE_URL ?? 'http://localhost:4321';
const outputRoot = path.resolve('public', 'hinode', 'review', 'browser');
const videoRoot = path.resolve('public', 'hinode', 'review', 'videos');
await fs.mkdir(outputRoot, { recursive: true });
await fs.mkdir(videoRoot, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const captures = [];
const metrics = {};

const capturePage = async ({
  name,
  route,
  rootSelector,
  drive = false,
  startOnly = false,
  steerKey = 'd',
  camera,
  viewport = { width: 1440, height: 900 },
}) => {
  const context = await browser.newContext({ viewport, colorScheme: 'dark' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
  await page.locator(rootSelector).waitFor({ state: 'attached' });
  await page.waitForFunction(
    (selector) =>
      globalThis.document.querySelector(selector)?.getAttribute('data-phase') === 'ready',
    rootSelector,
    { timeout: 30_000 },
  );
  if (camera) await page.locator(`[data-camera="${camera}"]`).click();
  if (startOnly) {
    await page.locator('[data-start-drive]').click();
    await page.waitForTimeout(700);
  }
  if (drive) {
    await page.locator('[data-start-drive]').click();
    await page.keyboard.down('w');
    await page.waitForTimeout(1_500);
    await page.keyboard.down(steerKey);
    await page.waitForTimeout(700);
    await page.keyboard.up(steerKey);
    await page.keyboard.up('w');
    await page.waitForTimeout(600);
  }
  const screenshotPath = path.join(outputRoot, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const dataset = await page.locator(rootSelector).evaluate((element) => ({
    ...element.dataset,
  }));
  metrics[name] = dataset;
  captures.push({
    name,
    route,
    screenshotPath,
    dataset,
    pageErrors: errors,
  });
  if (errors.length) throw new Error(`${name} raised page errors: ${errors.join(' | ')}`);
  await context.close();
};

await capturePage({
  name: 'handling-low-ready',
  route: '/play/hinode-handling-lab/?quality=low',
  rootSelector: '[data-handling-lab]',
});
await capturePage({
  name: 'handling-high-driving',
  route: '/play/hinode-handling-lab/?quality=high',
  rootSelector: '[data-handling-lab]',
  drive: true,
});
await capturePage({
  name: 'editor-isometric',
  route: '/play/hinode-editor/?quality=high',
  rootSelector: '[data-hinode-editor]',
  camera: 'iso',
});
await capturePage({
  name: 'editor-top',
  route: '/play/hinode-editor/?quality=low',
  rootSelector: '[data-hinode-editor]',
  camera: 'top',
});
for (const overlay of [
  'road-width',
  'footpaths',
  'parcels',
  'vegetation',
  'signs',
  'collision',
  'sightlines',
]) {
  await capturePage({
    name: `overlay-${overlay}`,
    route: `/play/hinode-editor/?quality=high&overlay=${overlay}`,
    rootSelector: '[data-hinode-editor]',
    camera: 'top',
  });
}
await capturePage({
  name: 'city-high-ready',
  route: '/play/hinode-city/?quality=high',
  rootSelector: '[data-hinode-city]',
});
await capturePage({
  name: 'city-high-driving',
  route: '/play/hinode-city/?quality=high',
  rootSelector: '[data-hinode-city]',
  drive: true,
  steerKey: 'a',
});

for (const review of [
  { id: 'touge', name: 'district-touge' },
  { id: 'alley', name: 'district-alley' },
  { id: 'downtown', name: 'district-downtown' },
  { id: 'port', name: 'district-port' },
  { id: 'waterfront', name: 'district-waterfront' },
  { id: 'flyover-review', name: 'feature-flyover' },
  { id: 'underpass-review', name: 'feature-underpass' },
]) {
  for (const view of ['driver', 'chase']) {
    await capturePage({
      name: `${review.name}-${view}`,
      route: `/play/hinode-city/?quality=high&review=${review.id}&view=${view}`,
      rootSelector: '[data-hinode-city]',
      startOnly: true,
    });
  }
}
await capturePage({
  name: 'city-low-driving',
  route: '/play/hinode-city/?quality=low',
  rootSelector: '[data-hinode-city]',
  drive: true,
  steerKey: 'a',
});

const recordDrive = async ({ name, route, rootSelector, durationMilliseconds, steerKey = 'd' }) => {
  const temporaryVideoRoot = path.join(videoRoot, '.capture');
  await fs.mkdir(temporaryVideoRoot, { recursive: true });
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
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    (selector) =>
      globalThis.document.querySelector(selector)?.getAttribute('data-phase') === 'ready',
    rootSelector,
    { timeout: 30_000 },
  );
  await page.locator('[data-start-drive]').click();
  await page.keyboard.down('w');
  await page.waitForTimeout(durationMilliseconds * 0.45);
  await page.keyboard.down(steerKey);
  await page.waitForTimeout(durationMilliseconds * 0.2);
  await page.keyboard.up(steerKey);
  await page.keyboard.down('Space');
  await page.waitForTimeout(durationMilliseconds * 0.12);
  await page.keyboard.up('Space');
  await page.keyboard.up('w');
  await page.waitForTimeout(durationMilliseconds * 0.23);
  await page.close();
  await context.close();
  const temporaryPath = await video.path();
  const finalPath = path.join(videoRoot, `${name}.webm`);
  await fs.copyFile(temporaryPath, finalPath);
  captures.push({ name, route, videoPath: finalPath });
};

await recordDrive({
  name: 'handling-lab-current',
  route: '/play/hinode-handling-lab/?quality=high',
  rootSelector: '[data-handling-lab]',
  durationMilliseconds: 6_000,
});
await recordDrive({
  name: 'hinode-city-current',
  route: '/play/hinode-city/?quality=high',
  rootSelector: '[data-hinode-city]',
  durationMilliseconds: 9_000,
  steerKey: 'a',
});

const recordMapOverview = async () => {
  const temporaryVideoRoot = path.join(videoRoot, '.capture');
  await fs.mkdir(temporaryVideoRoot, { recursive: true });
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
  await page.goto(`${baseURL}/play/hinode-editor/?quality=high`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(
    () =>
      globalThis.document.querySelector('[data-hinode-editor]')?.getAttribute('data-phase') ===
      'ready',
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(900);
  await page.locator('[data-camera="top"]').click();
  await page.waitForTimeout(900);
  for (const overlay of ['road-width', 'footpaths', 'parcels', 'vegetation', 'signs']) {
    await page.locator(`[data-overlay="${overlay}"]`).click();
    await page.waitForTimeout(700);
  }
  await page.locator('[data-camera="iso"]').click();
  await page.locator('[data-overlay="sightlines"]').click();
  await page.waitForTimeout(1_100);
  await page.close();
  await context.close();
  const temporaryPath = await video.path();
  const finalPath = path.join(videoRoot, 'hinode-map-route-overview.webm');
  await fs.copyFile(temporaryPath, finalPath);
  captures.push({
    name: 'hinode-map-route-overview',
    route: '/play/hinode-editor/?quality=high',
    videoPath: finalPath,
  });
};

await recordMapOverview();

await browser.close();
await fs.rm(path.join(videoRoot, '.capture'), { recursive: true, force: true });
const manifest = {
  capturedAt: new Date().toISOString(),
  baseURL,
  browser: 'installed Google Chrome via Playwright',
  captures,
  metrics,
};
await fs.writeFile(
  path.join(outputRoot, 'capture-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
globalThis.console.log(JSON.stringify(manifest, null, 2));
