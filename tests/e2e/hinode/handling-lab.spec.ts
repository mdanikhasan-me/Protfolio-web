import { expect, test } from '@playwright/test';

const lab = '[data-handling-lab]';

test('loads Rapier, the attributed Nightline, and a 120 Hz handling simulation', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/play/hinode-handling-lab/?quality=low');

  await expect(page.locator(lab)).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
  await expect(page.locator(lab)).toHaveAttribute('data-rapier', 'ready');
  await expect(page.locator(lab)).toHaveAttribute('data-physics-hz', '120');
  await expect(page.locator(lab)).toHaveAttribute('data-section-count', '13');
  await expect(page.locator(lab)).toHaveAttribute(
    'data-asset-id',
    'VEH_MAH_Nightline_R34_Derivative',
  );
  await expect(page.locator('[data-start-drive]')).toBeEnabled();

  expect(pageErrors).toEqual([]);
});

test('accelerates, steers, handbrakes, resets, and exposes live metrics', async ({ page }) => {
  await page.goto('/play/hinode-handling-lab/?quality=low');
  await expect(page.locator(lab)).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
  await page.locator('[data-start-drive]').click();
  await expect(page.locator(lab)).toHaveAttribute('data-phase', 'driving');

  await page.keyboard.down('w');
  await page.waitForTimeout(1_200);
  await page.keyboard.up('w');
  await expect
    .poll(async () => Number(await page.locator(lab).getAttribute('data-speed-kph')))
    .toBeGreaterThan(8);
  await expect
    .poll(async () => Number(await page.locator(lab).getAttribute('data-engine-rpm')))
    .toBeGreaterThan(900);
  await expect
    .poll(async () => Number(await page.locator(lab).getAttribute('data-physics-frame-ms')))
    .toBeGreaterThanOrEqual(0);

  const beforeYaw = Number(await page.locator(lab).getAttribute('data-vehicle-yaw'));
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await page.waitForTimeout(900);
  await page.keyboard.up('d');
  await page.keyboard.up('w');
  await expect
    .poll(async () => Number(await page.locator(lab).getAttribute('data-vehicle-yaw')))
    .not.toBe(beforeYaw);

  await page.keyboard.down('Space');
  await expect(page.locator(lab)).toHaveAttribute('data-rear-grip', '40');
  await page.keyboard.up('Space');

  await page.keyboard.press('c');
  await page.keyboard.press('c');
  await expect(page.locator(lab)).toHaveAttribute('data-camera-mode', '2');

  await page.locator('.handling-development summary').click();
  await page.locator('select[data-tuning-profile]').selectOption('drift-study');
  await expect(page.locator(lab)).toHaveAttribute('data-tuning-profile', 'drift-study');

  await page.keyboard.press('r');
  await expect(page.locator(lab)).toHaveAttribute('data-vehicle-x', '-47.000');
  await expect(page.locator(lab)).toHaveAttribute('data-vehicle-z', '20.000');
  await expect(page.locator(lab)).toHaveAttribute('data-reset-count', '1');
  await expect
    .poll(async () => Number(await page.locator(lab).getAttribute('data-draw-calls')))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await page.locator(lab).getAttribute('data-triangles')))
    .toBeGreaterThan(11_000);
});
