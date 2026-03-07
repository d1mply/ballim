import { test, expect } from '@playwright/test';

test.describe('Ballim smoke', () => {
  test('ana sayfa yüklenmeli', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ballim|3D/);
  });

  test('login sayfasına yönlendirme', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
  });
});
