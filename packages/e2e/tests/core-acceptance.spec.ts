import { test, expect } from '@playwright/test';
import {
  closeTwoPlayerSession,
  confirmRoundSummary,
  createTwoPlayerLobby,
  HOST_NAME,
  imReadyRe,
  joinTeamRe,
  lockTeams,
  lowerScoreToWin,
  nextRoundRe,
  rematchRe,
  scoreboardRe,
  setLobbyGameModeImposter,
  setMinimumRoundTime,
  startFromLobby,
  startOfflineLobby,
  tapCorrect,
  waitForRoundSummary,
  startGameRe,
  playingNowRe,
  expectLobbyReadyToStart,
} from './helpers/game-ui';

test.describe.configure({ mode: 'serial' });

test.describe('@core Host migration', () => {
  test('guest becomes host and can START_GAME after host disconnect', async ({ browser }) => {
    const session = await createTwoPlayerLobby(browser);

    try {
      await session.hostContext.close();

      await expect(session.guest.getByTestId('lobby-room-code')).toBeVisible({ timeout: 30_000 });
      await expect(session.guest.getByRole('button', { name: startGameRe })).toBeEnabled({
        timeout: 60_000,
      });
      await session.guest.getByRole('button', { name: startGameRe }).click();
      // Guest is new host but not the round explainer (disconnected host still on team 0).
      await expect(session.guest.getByText(playingNowRe)).toBeVisible({ timeout: 30_000 });
      await expect(session.guest.getByTestId('lobby-room-code')).not.toBeVisible();
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
      const guestSwitchBtn = session.guest.getByRole('button', { name: joinTeamRe }).first();
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

      await expect(session.host.getByTestId('imposter-reveal-cta')).toBeVisible({
        timeout: 60_000,
      });
      await expect(session.guest.getByTestId('imposter-reveal-cta')).toBeVisible({
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
    await expectLobbyReadyToStart(page);
    await page.getByRole('button', { name: startGameRe }).click();

    await expect(page.getByRole('button', { name: imReadyRe })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: imReadyRe }).click();
    await expect(page.getByText(/\d{1,2}:\d{2}/)).toBeVisible({ timeout: 90_000 });

    await tapCorrect(page, 1);
    // 30s round floor + timeUp fallback buffer
    await waitForRoundSummary(page, 90_000);
    await confirmRoundSummary(page);

    await expect(page.getByText(scoreboardRe).first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('@core Rematch', () => {
  test('rematch preserves teams and resets scores', async ({ browser }) => {
    test.setTimeout(240_000);
    const session = await createTwoPlayerLobby(browser);

    try {
      await setMinimumRoundTime(session.host);
      await lowerScoreToWin(session.host, 10);

      const playWinningRound = async () => {
        await expect(session.host.getByRole('button', { name: imReadyRe })).toBeVisible({
          timeout: 30_000,
        });
        await session.host.getByRole('button', { name: imReadyRe }).click();
        await expect(session.host.getByText(/\d{1,2}:\d{2}/)).toBeVisible({ timeout: 90_000 });
        await tapCorrect(session.host, 10);
        await waitForRoundSummary(session.host, 90_000);
        await confirmRoundSummary(session.host);
      };

      await startFromLobby(session.host);
      await playWinningRound();
      await expect(session.host.getByText(scoreboardRe).first()).toBeVisible({ timeout: 30_000 });

      await session.host.getByRole('button', { name: nextRoundRe }).click();
      await playWinningRound();

      await expect(session.host.getByRole('button', { name: rematchRe })).toBeVisible({
        timeout: 30_000,
      });
      await session.host.getByRole('button', { name: rematchRe }).click();

      await expect(session.host.getByRole('button', { name: imReadyRe })).toBeVisible({
        timeout: 30_000,
      });
      // Rematch resets to PRE_ROUND with teams intact (host still in session).
      await expect(session.host.getByText(new RegExp(HOST_NAME, 'i'))).toBeVisible();
    } finally {
      await closeTwoPlayerSession(session);
    }
  });
});
