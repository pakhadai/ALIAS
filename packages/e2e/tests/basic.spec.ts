import { test, expect } from '@playwright/test';

test.describe('ALIAS — basic smoke tests', () => {
  test('home page loads with ALIAS branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ALIAS/i);
    // Logo text should be visible
    await expect(page.locator('text=ALIAS').first()).toBeVisible();
  });

  test('Create Game button is visible', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: /Створити гру|Create Game|Spiel erstellen/i });
    await expect(btn).toBeVisible();
  });

  test('Join Game button is visible', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: /Приєднатися|Join Game|Beitreten/i });
    await expect(btn).toBeVisible();
  });

  test('Offline mode button is visible', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: /Офлайн|Offline/i });
    await expect(btn).toBeVisible();
  });

  test('can navigate to Join input screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Приєднатися|Join Game|Beitreten/i }).click();
    // Should show a room code input
    await expect(page.locator('input[placeholder]')).toBeVisible();
  });

  test('language toggle cycles through UA→DE→EN', async ({ page }) => {
    await page.goto('/');
    // Find language button (shows current language code)
    const langBtn = page.locator('button').filter({ hasText: /^(UA|DE|EN)$/ });
    await expect(langBtn).toHaveText('UA');
    await langBtn.click();
    await expect(langBtn).toHaveText('DE');
    await langBtn.click();
    await expect(langBtn).toHaveText('EN');
    await langBtn.click();
    await expect(langBtn).toHaveText('UA');
  });
});
