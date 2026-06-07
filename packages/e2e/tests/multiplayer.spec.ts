import { test, expect, type Page } from '@playwright/test';
import {
  closeTwoPlayerSession,
  createTwoPlayerLobby,
  GUEST_NAME,
  HOST_NAME,
  guestJoinByCode,
  playingNowRe,
  readRoomCode,
  startRoundToPlaying,
  submitName,
  createGameRe,
} from './helpers/game-ui';

test.describe.configure({ mode: 'serial' });

test.beforeEach(({ page: _page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile-chrome',
    'Multiplayer flows use two desktop contexts; skip mobile project.'
  );
});

/** Exact match avoids strict-mode collisions with toasts like «{name} приєднався». */
function expectPlayerVisible(page: Page, name: string) {
  return expect(page.getByText(name, { exact: true })).toBeVisible();
}

test.describe('Multiplayer (2 players)', () => {
  test('happy path: host creates room, guest joins, both reach playing with timer', async ({
    browser,
  }) => {
    const session = await createTwoPlayerLobby(browser);

    try {
      await startRoundToPlaying(session.host, session.guest);

      await expect(session.host.getByText(/\d{1,2}:\d{2}/)).toBeVisible({ timeout: 90_000 });
      await expect(
        session.guest.getByText(playingNowRe).or(session.guest.getByText(/\d{1,2}:\d{2}/))
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      await closeTwoPlayerSession(session);
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

      await guestJoinByCode(guestPage, roomCode);

      await expectPlayerVisible(guestPage, HOST_NAME);
      await expectPlayerVisible(guestPage, GUEST_NAME);

      await guestPage.reload({ waitUntil: 'load' });

      await expect(guestPage.getByText(HOST_NAME, { exact: true })).toBeVisible({
        timeout: 45_000,
      });
      await expect(guestPage.getByText(GUEST_NAME, { exact: true })).toBeVisible({
        timeout: 45_000,
      });
      await expect(guestPage.getByTestId('lobby-room-code')).toHaveText(roomCode, {
        timeout: 15_000,
      });

      await expectPlayerVisible(hostPage, GUEST_NAME);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
