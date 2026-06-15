import { test, expect, type Page } from '@playwright/test';
import { gotoAuthenticatedHome } from './helpers/auth-session';
import { gotoHome } from './helpers/game-ui';
import {
  expectLoginModalVisible,
  openProfileFromMenu,
  openStoreFromAuthProfile,
  openStoreFromGuestProfile,
  quickBuyTitleRe,
  storeTitleRe,
} from './helpers/menu-ui';

const paidPackPriceRe = /^\$\d+\.\d{2}$/;

function firstPaidPackBuyButton(page: Page) {
  return page.getByRole('button', { name: paidPackPriceRe }).first();
}

test.describe('@extended Store', () => {
  test('guest buy CTA redirects to profile and prompts login', async ({ page }) => {
    await gotoHome(page);
    await openProfileFromMenu(page);
    await openStoreFromGuestProfile(page);

    const buyBtn = firstPaidPackBuyButton(page);
    await expect(buyBtn).toBeVisible({ timeout: 45_000 });
    await buyBtn.click();

    await expectLoginModalVisible(page);
    await expect(page.getByRole('heading', { name: storeTitleRe })).toHaveCount(0);
  });

  test('authenticated user opens QuickBuy sheet without completing Stripe', async ({ page }) => {
    await gotoAuthenticatedHome(page);

    await openProfileFromMenu(page);
    await openStoreFromAuthProfile(page);

    const buyBtn = firstPaidPackBuyButton(page);
    await expect(buyBtn).toBeVisible({ timeout: 45_000 });
    await buyBtn.click();

    await expect(page.getByRole('heading', { name: quickBuyTitleRe })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('[data-bottom-sheet-backdrop][data-open="true"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Payment system not configured')).toBeVisible({
      timeout: 10_000,
    });
  });
});
