import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers/game-ui';

test.describe('@smoke MOVLI — basic smoke tests', () => {
  test('home page loads with MOVLI branding', async ({ page }) => {
    await gotoHome(page);
    await expect(page).toHaveTitle(/MOVLI/i);
    // Logo text should be visible
    await expect(page.locator('text=MOVLI').first()).toBeVisible();
  });

  test('Create Game button is visible', async ({ page }) => {
    await gotoHome(page);
    const btn = page.getByRole('button', { name: /Створити гру|Create Game|Spiel erstellen/i });
    await expect(btn).toBeVisible();
  });

  test('Join Game button is visible', async ({ page }) => {
    await gotoHome(page);
    const btn = page.getByRole('button', { name: /Приєднатися|Join Game|Beitreten/i });
    await expect(btn).toBeVisible();
  });

  test('Offline mode button is visible', async ({ page }) => {
    await gotoHome(page);
    const btn = page.getByRole('button', { name: /Офлайн|Offline/i });
    await expect(btn).toBeVisible();
  });

  test('can navigate to Join input screen', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Приєднатися|Join Game|Beitreten/i }).click();
    await expect(page.getByTestId('menu-quick-join-code')).toBeVisible();
  });

  test('language toggle cycles through UA→DE→EN', async ({ page }) => {
    await gotoHome(page);
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
