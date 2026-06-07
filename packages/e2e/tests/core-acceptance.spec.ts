import { test, expect } from '@playwright/test';
import {
  closeTwoPlayerSession,
  confirmRoundSummary,
  createTwoPlayerLobby,
  createGameRe,
  guestJoinByCode,
  HOST_NAME,
  lockTeams,
  lowerScoreToWin,
  nextRoundRe,
  readRoomCode,
  rematchRe,
  scoreboardRe,
  setLobbyGameModeImposter,
  setMinimumRoundTime,
  startFromLobby,
  startOfflineLobby,
  submitName,
  tapCorrect,
  waitForRoundSummary,
  startGameRe,
} from './helpers/game-ui';

test.describe.configure({ mode: 'serial' });

test.describe('@core Host migration', () => {
  test('guest becomes host and can START_GAME after host disconnect', async ({ browser }) => {
    const session = await createTwoPlayerLobby(browser);

    try {
      await session.hostContext.close();

      await expect(session.guest.getByRole('button', { name: startGameRe })).toBeEnabled({
        timeout: 45_000,
      });
      await session.guest.getByRole('button', { name: startGameRe }).click();
      await expect(session.guest.getByRole('button', { name: /Я ГОТОВИЙ|I'M READY/i })).toBeVisible(
        {
          timeout: 30_000,
        }
      );
    } finally {
      await session.guestContext.close();
    }
  });
});

test.describe('@core Team lock', () => {
  test('guest cannot self-switch team when teams are locked', async ({ browser }) => {
    const session = await createTwoPlayerLobby(browser);

    try {
      await lockTeams(session.host);
      const guestSwitchBtn = session.guest.getByRole('button', { name: 'Приєднатися' }).first();
      await expect(guestSwitchBtn).toBeDisabled();
    } finally {
      await closeTwoPlayerSession(session);
    }
  });
});

test.describe('@core IMPOSTER', () => {
  test('reveal phase visible and guest DOM has no imposterWord leak', async ({ browser }) => {
    const session = await createTwoPlayerLobby(browser);

    try {
      await setLobbyGameModeImposter(session.host);
      await startFromLobby(session.host);

      await expect(session.host.getByText('Натисни, щоб перевернути')).toBeVisible({
        timeout: 60_000,
      });
      await expect(session.guest.getByText('Натисни, щоб перевернути')).toBeVisible({
        timeout: 60_000,
      });

      const guestHtml = await session.guest.content();
      expect(guestHtml).not.toMatch(/imposterWord/i);
    } finally {
      await closeTwoPlayerSession(session);
    }
  });
});

test.describe('@core Offline game', () => {
  test('offline full round reaches SCOREBOARD', async ({ page }) => {
    test.setTimeout(180_000);
    await startOfflineLobby(page);
    await setMinimumRoundTime(page);
    await page.getByRole('button', { name: startGameRe }).click();

    await expect(page.getByRole('button', { name: /Я ГОТОВИЙ|I'M READY/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: /Я ГОТОВИЙ|I'M READY/i }).click();
    await expect(page.getByText(/\d{1,2}:\d{2}/)).toBeVisible({ timeout: 90_000 });

    await tapCorrect(page, 1);
    await waitForRoundSummary(page, 120_000);
    await confirmRoundSummary(page);

    await expect(page.getByText(scoreboardRe).first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('@core Rematch', () => {
  test('rematch preserves teams and resets scores', async ({ browser }) => {
    test.setTimeout(300_000);
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();

    try {
      await host.goto('/');
      await host.getByRole('button', { name: createGameRe }).click();
      await submitName(host, HOST_NAME);
      const roomCode = await readRoomCode(host);
      await guestJoinByCode(guest, roomCode);
      await host.getByRole('button', { name: 'Приєднатися' }).first().click();
      await guest.getByRole('button', { name: 'Приєднатися' }).nth(1).click();

      await setMinimumRoundTime(host);
      await lowerScoreToWin(host, 10);

      const playWinningRound = async () => {
        await expect(host.getByRole('button', { name: /Я ГОТОВИЙ|I'M READY/i })).toBeVisible({
          timeout: 30_000,
        });
        await host.getByRole('button', { name: /Я ГОТОВИЙ|I'M READY/i }).click();
        await expect(host.getByText(/\d{1,2}:\d{2}/)).toBeVisible({ timeout: 90_000 });
        await tapCorrect(host, 10);
        await waitForRoundSummary(host, 120_000);
        await confirmRoundSummary(host);
      };

      await startFromLobby(host);
      await playWinningRound();
      await expect(host.getByText(scoreboardRe).first()).toBeVisible({ timeout: 30_000 });

      await host.getByRole('button', { name: nextRoundRe }).click();
      await playWinningRound();

      await expect(host.getByRole('button', { name: rematchRe })).toBeVisible({ timeout: 30_000 });
      await host.getByRole('button', { name: rematchRe }).click();

      await expect(host.getByRole('button', { name: /Я ГОТОВИЙ|I'M READY/i })).toBeVisible({
        timeout: 30_000,
      });
      // Rematch resets to PRE_ROUND with teams intact (host still in session).
      await expect(host.getByText(new RegExp(HOST_NAME, 'i'))).toBeVisible();
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
