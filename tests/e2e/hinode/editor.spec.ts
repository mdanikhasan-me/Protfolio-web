import { expect, test } from '@playwright/test';

const editor = '[data-hinode-editor]';

test('loads the authoritative city layout with a permanently free camera', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/play/hinode-editor/?quality=low');

  await expect(page.locator(editor)).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });
  await expect(page.locator(editor)).toHaveAttribute('data-camera-locked', 'false');
  await expect(page.locator(editor)).toHaveAttribute('data-layout-valid', 'true');
  await expect(page.locator(editor)).toHaveAttribute('data-road-count', '11');
  await expect
    .poll(async () => Number(await page.locator(editor).getAttribute('data-triangles')))
    .toBeGreaterThan(0);

  await page.locator('[data-camera="top"]').click();
  await page.locator('[data-camera="street"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-camera-locked', 'false');
  expect(pageErrors).toEqual([]);
});

test('exposes every checkpoint planning overlay without locking the camera', async ({ page }) => {
  await page.goto('/play/hinode-editor/?quality=low&overlay=road-width');
  await expect(page.locator(editor)).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });
  await expect(page.locator(editor)).toHaveAttribute('data-active-overlay', 'road-width');
  await expect(page.locator(editor)).toHaveAttribute('data-camera-locked', 'false');

  for (const overlay of [
    'topology',
    'road-hierarchy',
    'elevation',
    'road-edges',
    'safety',
    'district-density',
    'footpaths',
    'parcels',
    'vegetation',
    'signs',
    'collision',
    'sightlines',
  ]) {
    await page.locator(`[data-overlay="${overlay}"]`).click();
    await expect(page.locator(editor)).toHaveAttribute('data-active-overlay', overlay);
    await expect(page.locator(editor)).toHaveAttribute('data-camera-locked', 'false');
  }
});

test('selects, transforms, snaps, duplicates, hides, locks, and undoes layout objects', async ({
  page,
}) => {
  await page.goto('/play/hinode-editor/?quality=low');
  await expect(page.locator(editor)).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });

  await page.locator('[data-key="road:main-loop"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-selected', 'road:main-loop');
  await page.locator('[data-transform-mode="rotate"]').click();
  await page.locator('[data-action="snap"]').click();
  await expect(page.locator('[data-action="snap"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('[data-action="duplicate"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-road-count', '12');
  await expect(page.locator(editor)).toHaveAttribute('data-selected', 'road:main-loop-copy-1');
  await page.locator('[data-action="hide"]').click();
  await page.locator('[data-action="lock"]').click();
  await expect(page.locator('[data-object-state]')).toContainText('HIDDEN / LOCKED');

  await page.locator('[data-action="undo"]').click();
  await page.locator('[data-action="undo"]').click();
  await page.locator('[data-action="undo"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-road-count', '11');
});

test('authors cubic Bezier roads and exposes user-controlled review views', async ({ page }) => {
  await page.goto('/play/hinode-editor/?quality=low');
  await expect(page.locator(editor)).toHaveAttribute('data-phase', 'ready', { timeout: 20_000 });

  await page.locator('[data-key="road:main-loop"]').click();
  await expect(page.locator('[data-road-inspector]')).toBeVisible();
  await expect(page.locator(editor)).toHaveAttribute('data-selected-road-point-count', '12');
  await page.locator('[data-road-point-action="next"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-selected-road-point', '1');

  await page.locator('[data-road-field="bank"]').fill('3');
  await page.locator('[data-road-field="bank"]').press('Tab');
  await page.locator('[data-road-field="footpath-left"]').fill('1.8');
  await page.locator('[data-road-field="footpath-left"]').press('Tab');
  await expect(page.locator(editor)).toHaveAttribute('data-layout-valid', 'true');

  await page.locator('[data-create-zone="parcel"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-last-created-zone', 'parcel');
  await expect(page.locator(editor)).toHaveAttribute('data-active-overlay', 'parcels');
  await expect(page.locator(editor)).toHaveAttribute('data-layout-valid', 'true');
  await page.locator('[data-action="undo"]').click();

  await page.locator('[data-camera="chase"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-camera-locked', 'false');
  await page.locator('[data-camera="playback"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-route-playback', 'true');
  await page.locator('[data-camera="playback"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-route-playback', 'false');

  await page.locator('[data-key="district:alley"]').click();
  await page.locator('[data-camera="isolate"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-isolated-district', 'alley');
  await page.locator('[data-camera="isolate"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-isolated-district', 'none');

  await page.locator('[data-create-road="flyover"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-road-count', '12');
  await expect(page.locator(editor)).toHaveAttribute('data-selected', /road:authored-flyover-/);
  await page.locator('[data-action="undo"]').click();
  await expect(page.locator(editor)).toHaveAttribute('data-road-count', '11');
});
