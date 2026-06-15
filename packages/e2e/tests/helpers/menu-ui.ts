import { expect, type Page } from '@playwright/test';
import { clickFixedChrome } from './game-ui';

export const profileButtonRe = /^Profile$/i;
export const profileSettingsNavRe =
  /^(Налаштування профілю|Profile settings|Profil-Einstellungen)$/i;
export const browseStoreRe = /^(Переглянути магазин|Browse store|Shop ansehen)$/i;
export const storeNavRe = /^(Магазин|Store|Shop)$/i;
export const storeTitleRe = /^(Магазин|Store|Shop)$/i;
export const quickBuyTitleRe = /^(Швидка оплата|Quick pay|Schnellkauf)$/i;
export const saveProfileRe = /^(Зберегти|Save|Speichern)$/i;
export const savedProfileRe = /^(Збережено|Saved|Gespeichert)$/i;
export const profileNamePlaceholderRe = /^(Твоє ім'я\.\.\.|Your name…|Dein Name…)$/i;
export const loginGoogleRe = /^(Увійти через Google|Continue with Google|Mit Google anmelden)$/i;
export const loginTitleRe = /^(Увійдіть в акаунт|Sign in|Anmelden)$/i;
export const loginContinueWithoutRe =
  /^(Продовжити без входу|Continue without signing in|Ohne Anmeldung fortfahren)$/i;

/** Login modal — GSI button lives in iframe; assert sheet chrome instead. */
export async function expectLoginModalVisible(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: loginTitleRe })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: loginContinueWithoutRe })).toBeVisible({
    timeout: 15_000,
  });
}

export async function openProfileFromMenu(page: Page): Promise<void> {
  const profileBtn = page.getByRole('button', { name: profileButtonRe });
  await clickFixedChrome(profileBtn);
  await expect(
    page
      .getByRole('button', { name: profileSettingsNavRe })
      .or(page.getByRole('button', { name: browseStoreRe }))
  ).toBeVisible({ timeout: 30_000 });
}

export async function openStoreFromGuestProfile(page: Page): Promise<void> {
  await page.getByRole('button', { name: browseStoreRe }).click();
  await expect(page.getByRole('heading', { name: storeTitleRe })).toBeVisible({
    timeout: 30_000,
  });
}

export async function openStoreFromAuthProfile(page: Page): Promise<void> {
  await page.getByRole('button', { name: storeNavRe }).click();
  await expect(page.getByRole('heading', { name: storeTitleRe })).toBeVisible({
    timeout: 30_000,
  });
}

export async function openProfileSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: profileSettingsNavRe }).click();
  await expect(page.getByPlaceholder(profileNamePlaceholderRe)).toBeVisible({
    timeout: 15_000,
  });
}
