import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  clickFixedChrome,
  closeTwoPlayerSession,
  confirmRoundSummary,
  correctRe,
  createTwoPlayerLobby,
  HOST_NAME,
  imReadyRe,
  joinTeamRe,
  lobbyStartButton,
  lockTeams,
  nextRoundRe,
  scoreboardRe,
  setLobbyGameModeImposter,
  lowerScoreToWin,
  setMinimumRoundTime,
  startFromLobby,
  startOfflineLobby,
  tapCorrect,
  waitForRoundSummary,
  playingNowRe,
} from './helpers/game-ui';

test.describe.configure({ mode: 'serial' });

test.describe('@core Host migration', () => {
  test('guest becomes host and can START_GAME after host disconnect', async ({ browser }) => {
    const session = await createTwoPlayerLobby(browser);

    try {
      await session.hostContext.close();

      await expect(session.guest.getByTestId('lobby-room-code')).toBeVisible({ timeout: 30_000 });
      const startBtn = lobbyStartButton(session.guest);
      await expect(startBtn).not.toHaveAttribute('aria-disabled', 'true', { timeout: 60_000 });
      await clickFixedChrome(startBtn);
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
    await startFromLobby(page);

    await page.getByRole('button', { name: imReadyRe }).click();
    await expect(page.getByRole('button', { name: correctRe })).toBeVisible({ timeout: 90_000 });

    await tapCorrect(page, 1);
    // 30s round floor + 30s timeUp fallback (+ buffer)
    await waitForRoundSummary(page, 75_000);
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

      const playRound = async (explainer: Page, correctCount: number) => {
        await expect(explainer.getByRole('button', { name: imReadyRe })).toBeVisible({
          timeout: 30_000,
        });
        await explainer.getByRole('button', { name: imReadyRe }).click();
        await expect(explainer.getByRole('button', { name: correctRe })).toBeVisible({
          timeout: 90_000,
        });
        if (correctCount > 0) {
          await tapCorrect(explainer, correctCount);
        }
        await waitForRoundSummary(explainer, 90_000);
        await confirmRoundSummary(session.host);
      };

      await startFromLobby(session.host);
      await playRound(session.host, 5);
      await expect(session.host.getByText(scoreboardRe).first()).toBeVisible({ timeout: 30_000 });

      await session.host.getByRole('button', { name: nextRoundRe }).click();
      await playRound(session.guest, 10);

      await expect(session.host.getByTestId('game-over-rematch')).toBeVisible({ timeout: 60_000 });
      await session.host.getByTestId('game-over-rematch').click();

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
