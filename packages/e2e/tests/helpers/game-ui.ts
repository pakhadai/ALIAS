import { expect, type Browser, type Page } from '@playwright/test';

export const HOST_NAME = 'E2E Host';
export const GUEST_NAME = 'E2E Guest';

/** Multilingual UI (UA / DE / EN). */
export const createGameRe = /Створити гру|Create Game|Spiel erstellen/i;
export const joinGameRe = /Приєднатися|Join Game|Beitreten/i;
export const nextRe = /Далі|Next|Weiter/i;
export const enterRoomRe = /Увійти|Enter|Eintreten/i;
export const startGameRe = /Почати гру|Start|Starten/i;
export const imReadyRe = /Я ГОТОВИЙ|I'M READY|ICH BIN BEREIT/i;
export const correctRe = /Вгадано|Correct|Richtig/i;
export const continueRe = /Далі|Continue|Weiter/i;
export const roundSummaryRe = /Час вийшов|Time's up|Zeit um/i;
export const scoreboardRe = /Очки|Points|Punkte/i;
export const rematchRe = /Реванш|Rematch|Revanche/i;
export const addPlayerRe = /Додати гравця|Add player|Spieler hinzufügen/i;

export type TwoPlayerSession = {
  hostContext: Awaited<ReturnType<Browser['newContext']>>;
  guestContext: Awaited<ReturnType<Browser['newContext']>>;
  host: Page;
  guest: Page;
  roomCode: string;
};

export async function submitName(page: Page, name: string): Promise<void> {
  await page.getByTestId('enter-name').fill(name);
  await page.getByTestId('enter-name-submit').click();
}

export async function readRoomCode(page: Page): Promise<string> {
  const code = page.getByTestId('lobby-room-code');
  await expect(code).toBeVisible({ timeout: 60_000 });
  const text = (await code.textContent())?.trim() ?? '';
  expect(text).toMatch(/^\d{5}$/);
  return text;
}

export async function guestJoinByCode(
  guest: Page,
  roomCode: string,
  name = GUEST_NAME
): Promise<void> {
  await guest.goto('/');
  await guest.getByTestId('menu-join-game').click();
  await guest.getByTestId('menu-quick-join-code').fill(roomCode);
  await guest.getByTestId('menu-quick-join-submit').click();
  await submitName(guest, name);
  await expect(guest.getByTestId('lobby-room-code')).toHaveText(roomCode, { timeout: 30_000 });
}

/** Host → team 0, guest → team 1 (TeamCard labels are UA-only). */
export async function assignDistinctTeams(host: Page, guest: Page): Promise<void> {
  await host.getByRole('button', { name: 'Приєднатися' }).first().click();
  await guest.getByRole('button', { name: 'Приєднатися' }).nth(1).click();
}

export async function createTwoPlayerLobby(browser: Browser): Promise<TwoPlayerSession> {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto('/');
  await host.getByTestId('menu-create-game').click();
  await submitName(host, HOST_NAME);
  const roomCode = await readRoomCode(host);
  await guestJoinByCode(guest, roomCode);
  await assignDistinctTeams(host, guest);

  return { hostContext, guestContext, host, guest, roomCode };
}

export async function closeTwoPlayerSession(session: TwoPlayerSession): Promise<void> {
  await session.hostContext.close();
  await session.guestContext.close();
}

export async function startFromLobby(host: Page): Promise<void> {
  await host.getByRole('button', { name: startGameRe }).click();
  const vs = host.getByText('VS', { exact: true });
  if (await vs.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await host.getByRole('button', { name: startGameRe }).click();
  }
}

export async function startRoundToPlaying(host: Page, guest: Page): Promise<void> {
  await startFromLobby(host);
  await expect(host.getByRole('button', { name: imReadyRe })).toBeVisible({ timeout: 30_000 });
  await host.getByRole('button', { name: imReadyRe }).click();
  await expect(host.getByText(/\d{1,2}:\d{2}/)).toBeVisible({ timeout: 90_000 });
  await expect(guest.getByText(/\d{1,2}:\d{2}/)).toBeVisible({ timeout: 90_000 });
}

export async function tapCorrect(page: Page, times = 1): Promise<void> {
  const btn = page.getByRole('button', { name: correctRe });
  for (let i = 0; i < times; i++) {
    await btn.click();
  }
}

export async function waitForRoundSummary(page: Page, timeoutMs = 90_000): Promise<void> {
  await expect(page.getByText(roundSummaryRe)).toBeVisible({ timeout: timeoutMs });
}

export async function confirmRoundSummary(host: Page): Promise<void> {
  await host.getByRole('button', { name: continueRe }).click();
}

export async function openLobbySettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Settings|Налаштування/i }).click();
}

export async function closeLobbySettings(page: Page): Promise<void> {
  await page.locator('header button').first().click();
}

export async function setLobbyGameModeImposter(host: Page): Promise<void> {
  await openLobbySettings(host);
  await host.getByRole('button', { name: /Imposter|Імпостер/i }).click();
  await closeLobbySettings(host);
}

export async function lockTeams(host: Page): Promise<void> {
  await host.getByRole('button', { name: 'Lock teams', exact: true }).click();
}

const addConfirmRe = /Додати|Add|Hinzufügen/i;
export const nextRoundRe = /Раунд|Round|Runde/i;

export async function addOfflinePlayer(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: addPlayerRe }).click();
  await page.locator('input').last().fill(name);
  await page.getByRole('button', { name: addConfirmRe }).click();
}

export async function startOfflineLobby(page: Page, hostName = 'Offline Host'): Promise<void> {
  await page.goto('/');
  await page.getByTestId('menu-offline').click();
  await submitName(page, hostName);
  await addOfflinePlayer(page, 'Offline Guest');
  await page.getByRole('button', { name: 'Приєднатися' }).first().click();
  await page.getByRole('button', { name: `Assign Offline Guest` }).click();
  await page.locator('.space-y-2 button').nth(1).click();
}

export async function setMinimumRoundTime(host: Page): Promise<void> {
  await openLobbySettings(host);
  const minus = host.getByRole('button', { name: /−10/ }).first();
  for (let i = 0; i < 3; i++) {
    await minus.click();
  }
  await closeLobbySettings(host);
}

export async function lowerScoreToWin(host: Page, target = 10): Promise<void> {
  await openLobbySettings(host);
  const scoreInput = host.locator('input[type="number"]').last();
  await scoreInput.fill(String(target));
  await scoreInput.blur();
  await closeLobbySettings(host);
}
