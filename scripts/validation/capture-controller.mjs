/* global document, window */
// Ordered renderer replay. This does not measure native capture rate or runtime performance.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, URL } from 'node:url';
import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import console from 'node:console';

const options = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const separator = arg.indexOf('=');
    if (!arg.startsWith('--') || separator < 3) throw new Error(`Expected --name=value: ${arg}`);
    return [arg.slice(2, separator), arg.slice(separator + 1)];
  }),
);
if (!options.playwright || !options.browser || !options.output) {
  throw new Error('Required: --playwright=<index.mjs> --browser=<exe> --output=<new directory>');
}
const scenario = options.scenario ?? 'controller';
const scrollPosition = Number(options.scroll ?? 0);
if (!Number.isFinite(scrollPosition) || scrollPosition < 0 || scrollPosition > 50000 ||
    (scenario === 'controller' && scrollPosition !== 0)) throw new Error('Invalid scroll position');
if (!['controller', 'idle'].includes(scenario)) throw new Error('Invalid scenario');
const url = new URL(options.url ?? 'http://127.0.0.1:4321/');
if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
  throw new Error('Use a local preview URL');
}
const cssWidth = Number(options.width ?? 2560);
const cssHeight = Number(options.height ?? 1296);
const pixelRatio = Number(options.dpr ?? 1);
if (
  !Number.isInteger(cssWidth) ||
  !Number.isInteger(cssHeight) ||
  cssWidth < 320 ||
  cssWidth > 4096 ||
  cssHeight < 320 ||
  cssHeight > 4096 ||
  !Number.isFinite(pixelRatio) ||
  pixelRatio < 1 ||
  pixelRatio > 1.5
) {
  throw new Error('Invalid CSS viewport or pixel ratio');
}
// Browser screenshots round up; the WebGL backing store rounds down at fractional DPR.
const width = Math.ceil(cssWidth * pixelRatio);
const height = Math.ceil(cssHeight * pixelRatio);
const firstPicture = Number(options.first ?? 1);
const expected = Number(options.count ?? 120);
if (
  !Number.isInteger(firstPicture) ||
  !Number.isInteger(expected) ||
  firstPicture < 1 ||
  expected < 2 ||
  expected > 1200 ||
  firstPicture + expected - 1 > 32607 ||
  (scenario === 'controller' && (firstPicture !== 1 || expected !== 120))
) {
  throw new Error('Invalid replay range; controller regression uses pictures 1-120');
}
const output = resolve(options.output);
const partial = `${output}.partial`;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const reducedMotion = options.reduced === 'true';
await mkdir(dirname(output), { recursive: true });
// Reserve the final path too: never overwrite earlier evidence, including a failed run.
await mkdir(output);
await mkdir(partial);
const sourcePaths = [
  'src/scripts/reference-opening-locked.ts',
  'src/scripts/reference-background-system.ts',
  'src/scripts/reference-fluid.ts',
  'src/scripts/home-state.ts',
  'public/media/identity/reference-a-desktop.glb',
  'dist/index.html',
];
const sourceHashes = Object.fromEntries(
  await Promise.all(sourcePaths.map(async (path) => [path, hash(await readFile(path))])),
);
const bundlePaths = (await readdir('dist/_astro')).filter((path) => /\.(js|css)$/.test(path));
const bundleHashes = Object.fromEntries(
  await Promise.all(
    bundlePaths.map(async (path) => [path, hash(await readFile(resolve('dist/_astro', path)))]),
  ),
);
const report = {
  kind: 'DETERMINISTIC_RENDERER_REPLAY',
  state: 'RUNNING',
  acceptance: 'NOT_EVALUATED',
  nativeCaptureRate: 'NOT_MEASURED',
  runtimePerformance: 'NOT_MEASURED',
  referenceComparison: 'NOT_PERFORMED',
  visuallyReviewed: 0,
  decodedPixelIntegrity: 'NOT_VERIFIED',
  createdAt: new Date().toISOString(),
  head: git('rev-parse', 'HEAD'),
  diffSha256: hash(git('diff', '--binary', 'HEAD')),
  sourceHashes,
  bundleHashes,
  harnessSha256: hash(await readFile(new URL(import.meta.url))),
  width,
  height,
  cssWidth,
  cssHeight,
  pixelRatio,
  expected,
  firstPicture,
  lastPicture: firstPicture + expected - 1,
  warmupPictures: firstPicture - 1,
  scenario,
  reducedMotion,
  replayStepSeconds: '1/120',
  inputSchedule:
    scenario === 'controller'
      ? 'p1 rest; p2 drag from center by 22% gizmo width / -16% height; hold through p90; release p91'
      : 'No pointer or scroll input',
  frames: [],
  errors: [],
  warnings: [],
  failedRequests: [],
};
url.searchParams.set('__capture', '1');
url.searchParams.set('__captureWidth', String(cssWidth));
url.searchParams.set('__captureHeight', String(cssHeight));
url.searchParams.set('__capturePixelRatio', String(pixelRatio));
report.url = url.href;
const { chromium } = await import(pathToFileURL(resolve(options.playwright)).href);
const browser = await chromium.launch({
  executablePath: resolve(options.browser),
  headless: true,
  args: ['--use-angle=d3d11'],
});
try {
  report.browserVersion = browser.version();
  const page = await browser.newPage({
    viewport: { width: cssWidth, height: cssHeight },
    deviceScaleFactor: pixelRatio,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (
      text ===
      "The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element."
    ) {
      report.warnings.push(text);
    } else if (message.type() === 'error') {
      report.errors.push(text.replace(/data:font\/[^'\s]+/g, '[inline font data]'));
    }
  });
  page.on('requestfailed', (request) => report.failedRequests.push(request.url()));
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto(url.href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => {
      const state = document.querySelector('[data-reference-opening]')?.dataset;
      return state?.captureReady === 'true' && state.galleryReady === 'true';
    },
    {},
    { timeout: 60000 },
  );
  report.loadedScripts = await page
    .locator('script[src]')
    .evaluateAll((nodes) => nodes.map((n) => n.src));
  if (scrollPosition > 0) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), scrollPosition);
    await page.waitForTimeout(500);
  }
  report.scrollInput = { requested: scrollPosition, actual: await page.evaluate(() => window.scrollY) };
  report.rendererDimensions = await page.evaluate(() => {
    const bridge = window.__referenceCapture;
    return {
      width: bridge.width,
      height: bridge.height,
      cssWidth: bridge.cssWidth,
      cssHeight: bridge.cssHeight,
      pixelRatio: bridge.pixelRatio,
    };
  });
  if (
    report.rendererDimensions.width !== Math.floor(cssWidth * pixelRatio) ||
    report.rendererDimensions.height !== Math.floor(cssHeight * pixelRatio) ||
    report.rendererDimensions.pixelRatio !== pixelRatio
  ) {
    throw new Error('Renderer backing dimensions or DPR do not match the capture request');
  }
  const bounds = await page.locator('[data-reference-gizmo]').boundingBox();
  if (scenario === 'controller' && !bounds) throw new Error('Controller is not visible');
  // Replay every preceding simulation step to initialize history-dependent state.
  // Warm-up frames are not saved and must never be counted as captured or reviewed.
  for (let first = 1; first < firstPicture; first += 240) {
    const last = Math.min(firstPicture - 1, first + 239);
    await page.evaluate(
      ({ first, last }) => {
        for (let picture = first; picture <= last; picture += 1) {
          window.__referenceCapture.renderPicture(picture);
        }
      },
      { first, last },
    );
    if (last % 2400 === 0 || last === firstPicture - 1)
      console.log(`WARMUP ${last}/${firstPicture - 1}`);
  }
  const started = performance.now();
  for (let picture = 1; picture <= expected; picture += 1) {
    const sourcePicture = firstPicture + picture - 1;
    if (scenario === 'controller' && picture === 2) {
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width * 0.72, bounds.y + bounds.height * 0.34);
    }
    if (scenario === 'controller' && picture === 91) await page.mouse.up();
    const state = await page.evaluate((index) => {
      window.__referenceCapture.renderPicture(index);
      return {
        quaternion: document.querySelector('[data-reference-fold]').textContent,
        dragging: document.querySelector('[data-reference-gizmo]').dataset.dragging === 'true',
        state: document.querySelector('[data-reference-state]').textContent,
      };
    }, sourcePicture);
    const bytes = await page.screenshot({ type: 'png' });
    if (
      !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.readUInt32BE(16) !== width ||
      bytes.readUInt32BE(20) !== height
    ) {
      throw new Error(`Invalid PNG header/dimensions at ${picture}`);
    }
    const file = `frame-${String(picture).padStart(6, '0')}.png`;
    await writeFile(resolve(partial, file), bytes, { flag: 'wx' });
    report.frames.push({
      picture,
      sourcePicture,
      file,
      simulatedTime: `${sourcePicture - 1}/120`,
      captureElapsedMs: performance.now() - started,
      pngSha256: hash(bytes),
      ...state,
    });
    if (picture % 30 === 0) console.log(`${picture}/${expected}`);
  }
  if (report.errors.length || report.failedRequests.length)
    throw new Error('Browser errors; see manifest');
  report.state = 'CAPTURED_PNG_HASHED';
  report.captured = report.frames.length;
  await writeFile(resolve(partial, 'manifest.json'), JSON.stringify(report, null, 2));
  // The reserved final directory is empty; move individual files without replacing any existing file.
  for (const frame of report.frames)
    await rename(resolve(partial, frame.file), resolve(output, frame.file));
  await rename(resolve(partial, 'manifest.json'), resolve(output, 'manifest.json'));
  console.log(JSON.stringify({ output, state: report.state, captured: report.captured }));
} catch (error) {
  report.state = 'FAILED';
  report.failure = String(error);
  await writeFile(resolve(partial, 'FAILED.json'), JSON.stringify(report, null, 2));
  throw error;
} finally {
  await browser.close();
}
