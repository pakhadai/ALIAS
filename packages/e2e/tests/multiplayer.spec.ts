import { test, expect, type Page } from '@playwright/test';

const HOST_NAME = 'E2E Host';
const GUEST_NAME = 'E2E Guest';

/** Multilingual UI (UA / DE / EN). */
const createGameRe = /Створити гру|Create Game|Spiel erstellen/i;
const joinGameRe = /Приєднатися|Join Game|Beitreten/i;
const nextRe = /Далі|Next|Weiter/i;
const enterRoomRe = /Увійти|Enter|Eintreten/i;
const startGameRe = /Почати гру|Start|Starten/i;
const imReadyRe = /Я ГОТОВИЙ|I'M READY|ICH BIN BEREIT/i;

test.describe.configure({ mode: 'serial' });

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === 'Mobile Chrome',
    'Multiplayer flows use two desktop contexts; skip mobile project.'
  );
});

async function submitName(page: Page, name: string): Promise<void> {
  await page.locator('input').first().fill(name);
  await page.getByRole('button', { name: nextRe }).click();
}

async function readRoomCode(hostPage: Page): Promise<string> {
  const codeLocator = hostPage.locator('span.text-4xl.font-serif').filter({ hasText: /^\d{5}$/ });
  await expect(codeLocator).toBeVisible({ timeout: 60_000 });
  const text = (await codeLocator.textContent())?.trim() ?? '';
  expect(text).toMatch(/^\d{5}$/);
  return text;
}

async function guestJoinFlow(guestPage: Page, roomCode: string): Promise<void> {
  await guestPage.goto('/');
  await guestPage.getByRole('button', { name: joinGameRe }).click();
  const codeInput = guestPage.locator('input[inputmode="numeric"], input[type="text"]').first();
  await codeInput.fill(roomCode);
  await guestPage.getByRole('button', { name: enterRoomRe }).click();
  await submitName(guestPage, GUEST_NAME);
}

/** Exact match avoids strict-mode collisions with toasts like «{name} приєднався». */
function expectPlayerVisible(page: Page, name: string) {
  return expect(page.getByText(name, { exact: true })).toBeVisible();
}

test.describe('Multiplayer (2 players)', () => {
  test('happy path: host creates room, guest joins, both reach playing with timer', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      await hostPage.goto('/');
      await hostPage.getByRole('button', { name: createGameRe }).click();
      await submitName(hostPage, HOST_NAME);

      const roomCode = await readRoomCode(hostPage);

      await guestJoinFlow(guestPage, roomCode);

      await expectPlayerVisible(hostPage, HOST_NAME);
      await expectPlayerVisible(hostPage, GUEST_NAME);
      await expectPlayerVisible(guestPage, HOST_NAME);
      await expectPlayerVisible(guestPage, GUEST_NAME);

      await hostPage.getByRole('button', { name: startGameRe }).click();
      await expect(hostPage.getByText('VS', { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(guestPage.getByText('VS', { exact: true })).toBeVisible({ timeout: 30_000 });

      await hostPage.getByRole('button', { name: startGameRe }).click();

      await expect(hostPage.getByRole('button', { name: imReadyRe })).toBeVisible({
        timeout: 30_000,
      });
      await hostPage.getByRole('button', { name: imReadyRe }).click();

      await expect(hostPage.getByText(/\d{1,2}:\d{2}/)).toBeVisible({ timeout: 90_000 });
      await expect(guestPage.getByText(/\d{1,2}:\d{2}/)).toBeVisible({ timeout: 90_000 });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });

  test('reconnect: guest reloads and returns to same lobby with both players', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      await hostPage.goto('/');
      await hostPage.getByRole('button', { name: createGameRe }).click();
      await submitName(hostPage, HOST_NAME);
      const roomCode = await readRoomCode(hostPage);

      await guestJoinFlow(guestPage, roomCode);

      await expectPlayerVisible(guestPage, HOST_NAME);
      await expectPlayerVisible(guestPage, GUEST_NAME);

      await guestPage.reload({ waitUntil: 'load' });

      await expect(guestPage.getByText(HOST_NAME, { exact: true })).toBeVisible({ timeout: 45_000 });
      await expect(guestPage.getByText(GUEST_NAME, { exact: true })).toBeVisible({ timeout: 45_000 });
      await expect(guestPage.locator('span.text-4xl.font-serif').filter({ hasText: roomCode })).toBeVisible({
        timeout: 15_000,
      });

      await expectPlayerVisible(hostPage, GUEST_NAME);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
