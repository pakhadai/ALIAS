import { test } from '@playwright/test';
import {
  closeTwoPlayerSession,
  createTwoPlayerLobby,
  setMinimumRoundTime,
  startRoundToPlaying,
  tapCorrect,
  waitForRoundSummary,
} from './helpers/game-ui';

test.describe('@smoke Online round — create → join → CORRECT → ROUND_SUMMARY', () => {
  test('full happy path on mobile viewport', async ({ browser }) => {
    test.setTimeout(180_000);
    const session = await createTwoPlayerLobby(browser);

    try {
      await setMinimumRoundTime(session.host);
      await startRoundToPlaying(session.host, session.guest);
      await tapCorrect(session.host, 1);
      // 10s round + 5s timeUp fallback (+ buffer)
      await waitForRoundSummary(session.host, 45_000);
      await waitForRoundSummary(session.guest, 45_000);
    } finally {
      await closeTwoPlayerSession(session);
    }
  });
});
