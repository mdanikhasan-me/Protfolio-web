import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://localhost:4321';
const outputDirectory = resolve('artifacts/visual');
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });

const captures = [
  { name: 'home-desktop', path: '/', width: 1440, height: 1000 },
  { name: 'home-mobile', path: '/', width: 390, height: 844 },
  {
    name: 'website-service-desktop',
    path: '/services/website-development/',
    width: 1440,
    height: 1000,
  },
  { name: 'soctukit-mobile', path: '/work/soctukit/', width: 390, height: 844 },
];

for (const capture of captures) {
  const context = await browser.newContext({
    viewport: { width: capture.width, height: capture.height },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  await page.goto(new globalThis.URL(capture.path, baseUrl).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.screenshot({
    path: resolve(outputDirectory, `${capture.name}.png`),
    fullPage: false,
    animations: 'disabled',
  });
  await context.close();
}

await browser.close();
globalThis.console.log(`Saved ${captures.length} visual captures to ${outputDirectory}.`);
