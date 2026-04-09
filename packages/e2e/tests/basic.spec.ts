import { test, expect } from '@playwright/test';

test.describe('@smoke ALIAS — basic smoke tests', () => {
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
    // Language selector is inside the app settings modal
    await page.getByRole('button', { name: 'Settings' }).click();

    const ua = page.getByRole('button', { name: 'UA', exact: true });
    const de = page.getByRole('button', { name: 'DE', exact: true });
    const en = page.getByRole('button', { name: 'EN', exact: true });

    await expect(ua).toBeVisible();
    await expect(de).toBeVisible();
    await expect(en).toBeVisible();

    await ua.click();
    await de.click();
    await en.click();
    await ua.click();
  });
});
