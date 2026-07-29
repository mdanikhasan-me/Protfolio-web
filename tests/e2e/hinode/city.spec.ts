import { expect, test } from '@playwright/test';

const city = '[data-hinode-city]';

test('loads the v2 500 x 350 metre candidate and attributed Nightline', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/play/hinode-city/?quality=low');

  await expect(page.locator(city)).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
  await expect(page.locator(city)).toHaveAttribute('data-layout-id', 'HINODE_CITY_V2_CANDIDATE');
  await expect(page.locator(city)).toHaveAttribute('data-map-width', '500');
  await expect(page.locator(city)).toHaveAttribute('data-map-depth', '350');
  await expect(page.locator(city)).toHaveAttribute('data-route-count', '11');
  await expect(page.locator(city)).toHaveAttribute('data-physics-hz', '120');
  await expect(page.locator(city)).toHaveAttribute('data-rapier', 'ready');
  await expect(page.locator(city)).toHaveAttribute(
    'data-asset-id',
    'VEH_MAH_Nightline_R34_Derivative',
  );
  await expect(page.locator('[data-start-drive]')).toBeVisible();
  await expect(page.locator('[data-start-drive]')).toBeEnabled();
  expect(pageErrors).toEqual([]);
});

test('opens deterministic district driver and chase review cameras', async ({ page }) => {
  await page.goto('/play/hinode-city/?quality=low&review=secondary-v2&view=driver');
  await expect(page.locator(city)).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
  await expect(page.locator(city)).toHaveAttribute('data-review', 'secondary-v2');
  await expect(page.locator(city)).toHaveAttribute('data-review-view', 'driver');
  await page.locator('[data-start-drive]').click();
  await expect(page.locator(city)).toHaveAttribute('data-phase', 'driving');

  await page.goto('/play/hinode-city/?quality=low&review=flyover-approach-v2&view=chase');
  await expect(page.locator(city)).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
  await expect(page.locator(city)).toHaveAttribute('data-review', 'flyover-approach-v2');
  await expect(page.locator(city)).toHaveAttribute('data-review-view', 'chase');
});

test('drives, steers, changes camera, reports road state, and resets', async ({ page }) => {
  await page.goto('/play/hinode-city/?quality=low');
  await expect(page.locator(city)).toHaveAttribute('data-phase', 'ready', { timeout: 30_000 });
  await page.locator('[data-start-drive]').click();
  await expect(page.locator(city)).toHaveAttribute('data-phase', 'driving');

  await page.keyboard.down('w');
  await page.waitForTimeout(1_300);
  await page.keyboard.up('w');
  await expect
    .poll(async () => Number(await page.locator(city).getAttribute('data-speed-kph')))
    .toBeGreaterThan(8);

  const beforeYaw = Number(await page.locator(city).getAttribute('data-vehicle-yaw'));
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await page.waitForTimeout(700);
  await page.keyboard.up('d');
  await page.keyboard.up('w');
  await expect
    .poll(async () => Number(await page.locator(city).getAttribute('data-vehicle-yaw')))
    .not.toBe(beforeYaw);
  await page.keyboard.press('c');
  await expect(page.locator(city)).not.toHaveAttribute('data-road', 'none');

  await page.keyboard.press('r');
  const candidate = await page.request
    .get('/hinode/layouts/hinode-city-v2-candidate.json')
    .then((response) => response.json());
  await expect(page.locator(city)).toHaveAttribute(
    'data-vehicle-x',
    Number(candidate.spawn.position[0]).toFixed(3),
  );
  await expect(page.locator(city)).toHaveAttribute(
    'data-vehicle-z',
    Number(candidate.spawn.position[2]).toFixed(3),
  );
  await expect
    .poll(async () => Number(await page.locator(city).getAttribute('data-draw-calls')))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await page.locator(city).getAttribute('data-draw-calls')))
    .toBeLessThan(150);
  await expect
    .poll(async () => Number(await page.locator(city).getAttribute('data-triangles')))
    .toBeGreaterThan(11_000);
});
