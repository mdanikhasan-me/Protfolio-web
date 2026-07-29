import { expect, test } from '@playwright/test';

test('serves the v2 candidate progress and evidence links', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/play/hinode-progress/');
  await expect(page).toHaveTitle('Hinode City v2 — candidate, not approved');
  await expect(page.locator('.review-shell h1')).toContainText('V2 candidate');
  await expect(page.getByText('candidate_awaiting_user_approval')).toBeVisible();
  await expect(page.locator('img')).toHaveCount(3);
  await expect(page.locator('a[href="/play/hinode-v2-evidence/"]').first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});
