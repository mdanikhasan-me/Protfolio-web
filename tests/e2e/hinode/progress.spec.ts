import { expect, test } from '@playwright/test';

test('serves the complete Checkpoint 4 approval package', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/play/hinode-progress/');
  await expect(page).toHaveTitle('Hinode City — Checkpoint 4 approval package');
  await expect(page.locator('[data-server]')).toContainText('Online', { timeout: 15_000 });
  await expect(page.locator('.decision-card > strong')).toContainText(
    'Approve the road language, route mix and handling direction',
  );
  await expect(page.locator('img')).toHaveCount(31);
  await expect(page.locator('video')).toHaveCount(3);

  const status = await page.request
    .get('/hinode/review/status.json')
    .then((response) => response.json());
  expect(status.schemaVersion).toBe(2);
  expect(status.layout).toMatchObject({
    widthMetres: 500,
    depthMetres: 350,
    roadCount: 9,
  });
  expect(status.evidence.requiredFiles).toHaveLength(37);
  expect(pageErrors).toEqual([]);
});
