import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const preview = '[data-hinode-preview]';

async function startDrive(page: Page) {
  await page.locator('[data-start-drive]').click();
}

test('loads the clean slice and exposes renderer metrics', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/play/hinode-preview/');
  await expect(page.locator(preview)).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });
  await expect(page.locator('[data-start-drive]')).toBeEnabled();

  await startDrive(page);
  await expect(page.locator(preview)).toHaveAttribute('data-phase', 'driving');
  await expect
    .poll(async () => Number(await page.locator(preview).getAttribute('data-triangles')))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await page.locator(preview).getAttribute('data-triangles')))
    .toBeLessThan(180_000);
  await expect
    .poll(async () => Number(await page.locator(preview).getAttribute('data-draw-calls')))
    .toBeLessThan(150);
  await expect
    .poll(async () => Number(await page.locator(preview).getAttribute('data-fps')))
    .toBeGreaterThan(55);

  expect(pageErrors).toEqual([]);
});

test('accelerates, steers, handbrakes, resets, and pauses', async ({ page }) => {
  await page.goto('/play/hinode-preview/');
  await expect(page.locator(preview)).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });
  await startDrive(page);

  await page.keyboard.down('w');
  await page.waitForTimeout(900);
  await page.keyboard.up('w');
  await expect
    .poll(async () => Number(await page.locator(preview).getAttribute('data-speed-kph')))
    .toBeGreaterThan(5);

  await page.keyboard.down('Space');
  await expect(page.locator(preview)).toHaveAttribute('data-grip', '58');
  await page.keyboard.up('Space');

  const beforeTurnX = Number(await page.locator(preview).getAttribute('data-vehicle-x'));
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await page.waitForTimeout(700);
  await page.keyboard.up('d');
  await page.keyboard.up('w');
  await expect
    .poll(async () => Number(await page.locator(preview).getAttribute('data-vehicle-x')))
    .not.toBe(beforeTurnX);

  await page.keyboard.press('r');
  await expect(page.locator(preview)).toHaveAttribute('data-vehicle-x', '-25.000');
  await expect(page.locator(preview)).toHaveAttribute('data-vehicle-z', '23.000');

  await page.keyboard.press('Escape');
  await expect(page.locator(preview)).toHaveAttribute('data-phase', 'paused');
  await expect(page.locator('[data-pause-panel]')).toBeVisible();
});

test('keeps unrelated public portfolio routes available', async ({ page }) => {
  for (const route of ['/', '/work/', '/contact/']) {
    const response = await page.goto(route);
    expect(response?.ok(), `${route} should return a successful response`).toBe(true);
    await expect(page.locator('body')).not.toBeEmpty();
  }
});
