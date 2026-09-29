/* global document, window */
// Browser regression for native scroll ownership. The stepped autoscroll case is
// simulated input, not proof of a native middle-button gesture or native FPS.
import { chromium } from '../../.codex-local/a-rebuild-review/browser-tools/node_modules/playwright-core/index.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';

const output = process.argv[2];
if (!output) throw new Error('Usage: node scripts/validation/verify-native-scroll.mjs <new SSD output directory>');
await mkdir(output); // Fail instead of overwriting earlier evidence.
const startedAt = new Date().toISOString();
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=d3d11'],
});
const states = [], errors = [], failures = [];
const readState = page => page.evaluate(() => ({
  y: window.scrollY,
  rail: document.querySelector('[data-curve-work]').dataset.railActive,
  presence: document.querySelector('[data-curve-work]').style.getPropertyValue('--curve-presence'),
  opening: document.querySelector('[data-reference-opening]').dataset.openingActive,
  topActive: document.querySelector('[data-section-link="top"]').getAttribute('aria-current'),
}));
try {
  for (const reduced of [false, true]) {
    const page = await browser.newPage({viewport: {width: 1691, height: 872}, reducedMotion: reduced ? 'reduce' : 'no-preference'});
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4321/', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.querySelector('[data-reference-opening]').dataset.galleryReady === 'true');
    for (const mode of ['native-jump', 'stepped-autoscroll', 'keyboard-home', 'refresh']) {
      await page.mouse.wheel(0, 4000 - (await readState(page)).y);
      await page.waitForTimeout(1800);
      const before = await readState(page);
      if (before.rail !== 'true') failures.push(`${reduced}/${mode}: did not enter Works`);
      if (mode === 'keyboard-home') await page.keyboard.press('Control+Home');
      else if (mode === 'refresh') await page.reload({waitUntil: 'networkidle'});
      else if (mode === 'native-jump') await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
      else {
        await page.mouse.down({button: 'middle'});
        await page.mouse.up({button: 'middle'});
        for (let step = 0; step < 35; step++) {
          await page.evaluate(() => window.scrollBy({top: -150, behavior: 'instant'}));
          await page.waitForTimeout(16);
        }
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(2200);
      const after = await readState(page);
      if (after.y !== 0 || after.rail !== 'false' || Number(after.presence) !== 0 || after.opening !== 'true' || after.topActive !== 'location') failures.push(`${reduced}/${mode}: opening did not recover`);
      states.push({reduced, mode, before, after});
      await page.screenshot({path: resolve(output, `${reduced ? 'reduced' : 'normal'}-${mode}.png`)});
    }
    await page.close();
  }
} finally {
  await browser.close();
}
const sources = {};
for (const path of ['src/scripts/home-state.ts', 'src/scripts/light-chapters.ts', 'dist/index.html']) {
  sources[path] = createHash('sha256').update(await readFile(path)).digest('hex');
}
const report = {startedAt, completedAt: new Date().toISOString(), browser: browser.version(), sources, states, errors, failures, nativeAutoscrollSimulation: true, nativeRuntimePerformance: 'NOT_MEASURED'};
await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({cases: states.length, errors, failures}));
if (errors.length || failures.length) process.exitCode = 1;
