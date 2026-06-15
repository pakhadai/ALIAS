import { test, expect } from '@playwright/test';
import { gotoAuthenticatedHome } from './helpers/auth-session';
import { gotoHome } from './helpers/game-ui';
import {
  expectLoginModalVisible,
  openProfileFromMenu,
  openProfileSettings,
  openStoreFromGuestProfile,
  profileNamePlaceholderRe,
  saveProfileRe,
  savedProfileRe,
} from './helpers/menu-ui';

test.describe('@extended Profile', () => {
  test('guest can browse store from profile', async ({ page }) => {
    await gotoHome(page);
    await openProfileFromMenu(page);
    await openStoreFromGuestProfile(page);
    await expect(page.getByText('Набори слів').or(page.getByText('Word packs'))).toBeVisible({
      timeout: 30_000,
    });
  });

  test('authenticated user saves profile display name', async ({ page }) => {
    await gotoAuthenticatedHome(page);

    await openProfileFromMenu(page);
    await openProfileSettings(page);

    const nameInput = page.getByPlaceholder(profileNamePlaceholderRe);
    const newName = `E2E${Date.now().toString().slice(-6)}`;
    await nameInput.fill(newName);

    await page.getByRole('button', { name: saveProfileRe }).click();
    await expect(page.getByRole('button', { name: savedProfileRe })).toBeVisible({
      timeout: 30_000,
    });

    await page.reload();
    await gotoAuthenticatedHome(page);
    await openProfileFromMenu(page);
    await openProfileSettings(page);
    await expect(page.getByPlaceholder(profileNamePlaceholderRe)).toHaveValue(newName, {
      timeout: 15_000,
    });
  });

  test('guest lobby settings entry prompts login', async ({ page }) => {
    await gotoHome(page);
    await openProfileFromMenu(page);
    await page.getByTestId('profile-guest-lobby-settings').click();
    await expectLoginModalVisible(page);
  });
});
