import console from 'node:console';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const outputDirectory = path.join(root, 'artifacts/hinode/browser');
const captureDirectory = await mkdtemp(path.join(os.tmpdir(), 'hinode-browser-review-'));
const baseUrl = process.env.HINODE_BASE_URL ?? 'http://localhost:4321';
const viewport = { width: 1440, height: 900 };

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport,
  colorScheme: 'dark',
  recordVideo: {
    dir: path.join(captureDirectory, 'video'),
    size: { width: 1280, height: 720 },
  },
});
const page = await context.newPage();
const video = page.video();
const previewSelector = '[data-hinode-preview]';
const screenshots = [];
const driveLog = [];

const screenshot = async (name) => {
  const output = path.join(captureDirectory, name);
  await page.screenshot({ path: output, fullPage: false });
  screenshots.push(name);
  console.log(`Captured ${name}`);
};

const telemetry = async () =>
  page.locator(previewSelector).evaluate((element) => {
    const rootElement = /** @type {HTMLElement} */ (element);
    return {
      x: Number(rootElement.dataset.vehicleX),
      z: Number(rootElement.dataset.vehicleZ),
      yaw: Number(rootElement.dataset.vehicleYaw),
      speedKph: Number(rootElement.dataset.speedKph),
      collisions: Number(rootElement.dataset.collisions),
      road: rootElement.dataset.road ?? 'unknown',
      fps: Number(rootElement.dataset.fps),
      drawCalls: Number(rootElement.dataset.drawCalls),
      triangles: Number(rootElement.dataset.triangles),
      textures: Number(rootElement.dataset.textures),
      geometries: Number(rootElement.dataset.geometries),
    };
  });

const keyState = new Set();
const setKey = async (key, active) => {
  if (active && !keyState.has(key)) {
    keyState.add(key);
    await page.keyboard.down(key);
  } else if (!active && keyState.has(key)) {
    keyState.delete(key);
    await page.keyboard.up(key);
  }
};
const releaseControls = async () => {
  for (const key of [...keyState]) await setKey(key, false);
};

const normaliseAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const waypoints = [
  { x: -25.0, z: 18.0, capture: 'hinode-browser-alley.png' },
  { x: -25.0, z: 14.0 },
  { x: -24.0, z: 10.0 },
  { x: -23.3, z: 7.05 },
  { x: -21.8, z: 4.35 },
  { x: -19.5, z: 2.05, capture: 'hinode-browser-curve.png' },
  { x: -17.0, z: 0.55 },
  { x: -14.8, z: -0.15 },
  { x: -13.0, z: -0.5, capture: 'hinode-browser-junction.png' },
  { x: -9.0, z: -0.5, capture: 'hinode-browser-merge.png' },
  { x: -5.0, z: -0.4, capture: 'hinode-browser-flyover.png', camera: true },
  { x: -1.0, z: -0.3 },
  { x: 4.0, z: -0.5 },
  { x: 9.0, z: -1.2, capture: 'hinode-browser-secondary.png' },
];

await page.goto(`${baseUrl}/play/hinode-preview/?debug=1`, { waitUntil: 'networkidle' });
await page.locator(previewSelector).waitFor({ state: 'visible' });
await page.waitForFunction(
  (selector) => globalThis.document.querySelector(selector)?.getAttribute('data-phase') === 'ready',
  previewSelector,
  { timeout: 20_000 },
);
await page.waitForTimeout(650);
await screenshot('hinode-browser-loaded.png');
await page.locator('[data-start-drive]').click();
await page.locator('[data-hinode-canvas]').focus();

let waypointIndex = 0;
let nextCaptureAt = 0;
const startedAt = Date.now();
while (waypointIndex < waypoints.length && Date.now() - startedAt < 90_000) {
  const state = await telemetry();
  const waypoint = waypoints[waypointIndex];
  const deltaX = waypoint.x - state.x;
  const deltaZ = waypoint.z - state.z;
  const distance = Math.hypot(deltaX, deltaZ);
  const desiredYaw = Math.atan2(-deltaX, -deltaZ);
  const yawError = normaliseAngle(desiredYaw - state.yaw);

  await setKey('w', state.speedKph < 18);
  await setKey('s', state.speedKph > 24);
  await setKey('d', yawError < -0.035);
  await setKey('a', yawError > 0.035);

  driveLog.push({
    elapsedMs: Date.now() - startedAt,
    waypointIndex,
    distance: Number(distance.toFixed(2)),
    yawError: Number(yawError.toFixed(3)),
    ...state,
  });

  if (distance < 1.15) {
    await releaseControls();
    await page.waitForTimeout(280);
    if (waypoint.capture && Date.now() >= nextCaptureAt) {
      if (waypoint.camera) {
        await page.keyboard.press('c');
        await page.waitForTimeout(350);
      }
      await screenshot(waypoint.capture);
      nextCaptureAt = Date.now() + 180;
      if (waypoint.camera) await page.keyboard.press('c');
    }
    console.log(`Reached waypoint ${waypointIndex}: ${JSON.stringify(state)}`);
    waypointIndex += 1;
  }
  await page.waitForTimeout(65);
}
await releaseControls();

if (waypointIndex < waypoints.length) {
  const state = await telemetry();
  await writeFile(
    path.join(outputDirectory, 'hinode-browser-drive-failure.json'),
    `${JSON.stringify({ waypointIndex, state, driveLog }, null, 2)}\n`,
    'utf8',
  );
  throw new Error(
    `Automated drive stopped at waypoint ${waypointIndex}/${waypoints.length}: ${JSON.stringify(state)}`,
  );
}

await page.waitForTimeout(600);
await screenshot('hinode-browser-debug.png');
const metrics = await telemetry();

const errorPage = await context.newPage();
await errorPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
await errorPage.waitForTimeout(700);
await errorPage.screenshot({
  path: path.join(captureDirectory, 'hinode-browser-font-error.png'),
  fullPage: false,
});
screenshots.push('hinode-browser-font-error.png');
await errorPage.close();

await page.close();
const gameplayCaptureName = 'hinode-gameplay.webm';
const gameplayCapture = path.join(captureDirectory, gameplayCaptureName);
if (video) await video.saveAs(gameplayCapture);
await context.close();
await browser.close();

for (const screenshotName of screenshots) {
  await copyFile(
    path.join(captureDirectory, screenshotName),
    path.join(outputDirectory, screenshotName),
  );
}
await copyFile(gameplayCapture, path.join(outputDirectory, gameplayCaptureName));

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  route: '/play/hinode-preview/?debug=1',
  browser: 'system Chrome via Playwright',
  automated: true,
  manualQa: false,
  viewport,
  screenshots: screenshots.map((file) =>
    path.relative(root, path.join(outputDirectory, file)).replaceAll('\\', '/'),
  ),
  gameplayCapture: path
    .relative(root, path.join(outputDirectory, gameplayCaptureName))
    .replaceAll('\\', '/'),
  waypointCount: waypoints.length,
  driveDurationMs: Date.now() - startedAt,
  ...metrics,
  driveLog,
};
await writeFile(
  path.join(outputDirectory, 'hinode-browser-metrics.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);
await rm(captureDirectory, { recursive: true, force: true });
console.log(
  `Hinode browser evidence complete: ${screenshots.length} screenshots, ${metrics.drawCalls} calls, ${metrics.triangles} triangles`,
);
