import { test, expect } from '@playwright/test';
import {
  closeTwoPlayerSession,
  createTwoPlayerLobby,
  guestJoinByCode,
  HOST_NAME,
  imReadyRe,
  joinTeam,
  joinTeamRe,
  lockTeams,
  expectLobbyReadiness,
  readRoomCode,
  startFromLobby,
  submitName,
} from './helpers/game-ui';

test.describe.configure({ mode: 'serial' });

test.beforeEach(({ page: _page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile-chrome',
    'Lobby team builder uses two desktop contexts; mobile covered by smoke-round.'
  );
});

test.describe('@core Lobby team builder', () => {
  test('assign teams, lock, start validation, and reach pre-round', async ({ browser }) => {
    test.setTimeout(120_000);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();

    try {
      await host.goto('/');
      await host.getByTestId('menu-create-game').click();
      await submitName(host, HOST_NAME);
      const roomCode = await readRoomCode(host);
      await guestJoinByCode(guest, roomCode);

      await expectLobbyReadiness(host, { ready: false });

      await joinTeam(host, 0);
      await joinTeam(guest, 1);
      await expectLobbyReadiness(host, { ready: true });

      await lockTeams(host);
      await expect(guest.getByRole('button', { name: joinTeamRe }).first()).toBeDisabled();

      await startFromLobby(host);
      await expect(host.getByRole('button', { name: imReadyRe })).toBeVisible({ timeout: 30_000 });
      await expect(host.getByTestId('lobby-room-code')).not.toBeVisible();
    } finally {
      await hostContext.close().catch(() => undefined);
      await guestContext.close().catch(() => undefined);
    }
  });
});

test.describe('@smoke Lobby team builder', () => {
  test('create → join → assign → start', async ({ browser }) => {
    test.setTimeout(90_000);
    const session = await createTwoPlayerLobby(browser);

    try {
      await startFromLobby(session.host);
      await expect(session.host.getByRole('button', { name: imReadyRe })).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await closeTwoPlayerSession(session);
    }
  });
});
