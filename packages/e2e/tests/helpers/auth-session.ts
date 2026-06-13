import fs from 'fs';
import path from 'path';
import { expect, type Page } from '@playwright/test';
import { dismissLoginModalIfOpen, installE2eBrowserSession } from './game-ui';

export const AUTH_TOKEN_KEY = 'movli_auth_token';
export const DEVICE_ID_KEY = 'movli_device_id';
const LOGIN_DISMISSED_STORAGE_KEY = 'movli_login_dismissed';

export type E2eAuthFixture = {
  token: string;
  email: string;
  userId: string;
};

function authFixturePath(): string {
  return path.resolve(__dirname, '..', '..', '.e2e-auth.json');
}

/** Read JWT fixture written by global-setup (`seed-e2e-auth-user.ts`). */
export function loadE2eAuthFixture(): E2eAuthFixture {
  const raw = fs.readFileSync(authFixturePath(), 'utf8');
  const parsed = JSON.parse(raw) as E2eAuthFixture;
  if (!parsed.token || !parsed.userId) {
    throw new Error('[e2e] invalid .e2e-auth.json — re-run global-setup');
  }
  return parsed;
}

/** Bootstrap page with a seeded Google test user (real JWT + DB row). */
export async function installAuthenticatedSession(
  page: Page,
  auth: E2eAuthFixture = loadE2eAuthFixture()
): Promise<void> {
  await installE2eBrowserSession(page);
  const deviceId = `e2e_auth_${auth.userId}`;
  await page.addInitScript(
    ({ tokenKey, token, deviceIdKey, deviceId, dismissedKey }) => {
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(deviceIdKey, deviceId);
      sessionStorage.setItem(dismissedKey, '1');
    },
    {
      tokenKey: AUTH_TOKEN_KEY,
      token: auth.token,
      deviceIdKey: DEVICE_ID_KEY,
      deviceId,
      dismissedKey: LOGIN_DISMISSED_STORAGE_KEY,
    }
  );
}

async function waitForAuthMeOk(page: Page, token: string): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(async (jwtToken) => {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${jwtToken}` },
          });
          return res.status;
        }, token),
      { timeout: 45_000 }
    )
    .toBe(200);
}

/** Navigate home and wait until `/api/auth/me` succeeds for the seeded JWT. */
export async function gotoAuthenticatedHome(
  page: Page,
  auth: E2eAuthFixture = loadE2eAuthFixture()
): Promise<void> {
  await installAuthenticatedSession(page, auth);
  await page.goto('/');
  await dismissLoginModalIfOpen(page);
  await waitForAuthMeOk(page, auth.token);
  await expect(page.getByTestId('menu-profile-guest-badge')).toHaveCount(0, {
    timeout: 15_000,
  });
}
