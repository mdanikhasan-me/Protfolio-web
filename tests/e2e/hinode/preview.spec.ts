import { expect, test } from '@playwright/test';

test('keeps the preview URL connected to the replacement city', async ({ page }) => {
  await page.goto('/play/hinode-preview/');
  await expect(page).toHaveURL(/\/play\/hinode-city\/$/);
  await expect(page.locator('[data-hinode-city]')).toHaveAttribute('data-phase', 'ready', {
    timeout: 30_000,
  });
});
