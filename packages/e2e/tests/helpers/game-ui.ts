import { expect, type Browser, type Locator, type Page } from '@playwright/test';

export const HOST_NAME = 'E2E Host';
export const GUEST_NAME = 'E2E Guest';

/** Multilingual UI (UA / DE / EN). */
export const createGameRe = /Створити гру|Create Game|Spiel erstellen/i;
export const joinGameRe = /Приєднатися|Join Game|Beitreten/i;
export const nextRe = /Далі|Next|Weiter/i;
export const enterRoomRe = /Увійти|Enter|Eintreten/i;
/** Lobby START — anchored so it does not match countdown "Starting…". */
export const startGameRe = /^(Почати гру|Start|Starten)$/i;
export const imReadyRe = /Я ГОТОВИЙ|I'M READY|ICH BIN BEREIT/i;
export const playingNowRe = /Зараз грає|Playing|Spielt gerade/i;
/** Non-explainer view during PLAYING (`GuesserFeedback`). */
export const guestGuessRe = /Ви відгадуєте|You guess|Ihr ratet/i;
export const correctRe = /Вгадано|Correct|Richtig/i;
export const continueRe = /Далі|Continue|Weiter/i;
export const roundSummaryRe = /Час вийшов|Time's up|Zeit um/i;
export const scoreboardRe = /Очки|Points|Punkte/i;
export const rematchRe = /Реванш|Rematch|Revanche/i;
export const addPlayerRe = /Додати гравця|Add Player|Spieler hinzufügen/i;

/** TeamCard join — distinct from menu joinGame (Join Game / Beitreten). */
export const joinTeamRe = /^(В команду|Join team|Zum Team)$/i;
/** LobbyPlayModeBar TEAMS segment (`t.teamModeTeams`) — default room mode is SOLO since 2026-06-11. */
export const teamsModeRe = /^(Команди|Teams)$/i;
export const teamLeaveRe = /^(Вийти|Leave|Verlassen)$/i;
/** UnassignedPool offline assign trigger (`aria-label` per locale). */
export function assignPlayerButton(page: Page, playerName: string) {
  const escaped = playerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.getByRole('button', {
    name: new RegExp(`^(Призначити ${escaped}|Assign ${escaped}|${escaped} zuweisen)$`, 'i'),
  });
}
/** Lobby team lock toggle (`t.lockTeams` / `t.unlockTeams`). */
export const lockTeamsRe =
  /^(Lock teams|Unlock teams|Заблокувати команди|Розблокувати команди|Teams sperren|Teams entsperren)$/i;
/** Imposter reveal card CTA (`t.imposterTapToFlip` + data-testid). */
export const imposterRevealRe = /^(Натисни, щоб перевернути|Tippen zum Umdrehen|Tap to flip)$/i;

/** In-room settings gear (`t.settings` aria-label). */
export const lobbySettingsButtonRe = /^(Settings|Налаштування|Einstellungen)$/i;
/** @deprecated Header gear removed from lobby (2026-06-11). Use `lobby-settings-chips` via `openLobbySettings`. */
/** SettingsScreen rules tab (`t.rulesTitle`). */
export const lobbySettingsRulesTabRe = /^(Правила|Rules|Regeln)$/;
/** Collapsible "Time & goal" block on the rules tab (`t.lobbyRulesSectionBasics`). */
export const lobbyRulesBasicsRe = /^(Час і перемога|Zeit & Ziel|Time & goal)$/i;
export const scoreToWinMinusRe = /^(Перемога при −5|Win at −5|Sieg bei −5)$/;
/** Round-time stepper minus (`aria-label={t.roundTime + ' −10'}`), Unicode minus U+2212. */
export const roundTimeMinusButtonRe = /^(Час|Zeit|Time) −10$/;

/** Modal confirm (t.add). Anchors required — Playwright ignores `exact` when name is RegExp. */
const addConfirmRe = /^(Додати|Add|Hinzufügen)$/i;

export type TwoPlayerSession = {
  hostContext: Awaited<ReturnType<Browser['newContext']>>;
  guestContext: Awaited<ReturnType<Browser['newContext']>>;
  host: Page;
  guest: Page;
  roomCode: string;
};

const dismissLoginRe =
  /Продовжити без входу|Continue without signing in|Ohne Anmeldung fortfahren/i;

const LOGIN_DISMISSED_STORAGE_KEY = 'movli_login_dismissed';

/**
 * Per-page E2E bootstrap: strip TMA detection and skip auto login sheet on menu.
 * Call before the first navigation on each Page (safe to repeat).
 */
export async function installE2eBrowserSession(page: Page): Promise<void> {
  await neuterTelegramMiniAppDetection(page);
  await page.addInitScript((storageKey: string) => {
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      /* noop — private mode */
    }
  }, LOGIN_DISMISSED_STORAGE_KEY);
}

/**
 * Telegram Web App SDK loads in `index.html` for all browsers — strip detection fields so
 * E2E sees browser chrome (`settings-close` / `app-header-back`) instead of TMA spacers.
 */
export async function neuterTelegramMiniAppDetection(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const strip = (): void => {
      const wa = window.Telegram?.WebApp;
      if (!wa) return;
      try {
        Object.defineProperty(wa, 'initData', { get: () => '', configurable: true });
        Object.defineProperty(wa, 'platform', { get: () => '', configurable: true });
        Object.defineProperty(wa, 'initDataUnsafe', { get: () => undefined, configurable: true });
      } catch {
        /* noop — best effort for E2E */
      }
    };
    strip();
    window.addEventListener('load', strip, { once: true });
    const poll = window.setInterval(() => {
      if (window.Telegram?.WebApp) {
        strip();
        window.clearInterval(poll);
      }
    }, 25);
    window.setTimeout(() => window.clearInterval(poll), 5_000);
  });
}

/** Force browser header chrome before navigating to settings (SDK may load after init script). */
export async function forceBrowserChromeMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as { Telegram?: unknown }).Telegram;
  });
}

/**
 * Clicks viewport-fixed glass chrome (header/footer portals).
 * Avoid scrollIntoViewIfNeeded — it scrolls the page to the portal node's document position.
 */
export async function clickFixedChrome(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible({ timeout: 30_000 });
  const ariaDisabled = await locator.getAttribute('aria-disabled');
  if (ariaDisabled !== 'true') {
    await expect(locator).toBeEnabled({ timeout: 10_000 });
  }
  try {
    await locator.click({ force: true, timeout: 15_000 });
  } catch {
    await locator.dispatchEvent('click');
  }
}

/** Lobby start CTA in the fixed footer island (stable test id). */
export function lobbyStartButton(page: Page): Locator {
  return page.getByTestId('lobby-start-btn');
}

/** Anonymous web app shows a login sheet on the menu — dismiss before game flows. */
export async function dismissLoginModalIfOpen(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: dismissLoginRe });
  const visible = await btn
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  if (visible) {
    await btn.click();
    await expect(page.locator('[data-bottom-sheet-backdrop][data-open="true"]')).toHaveCount(0, {
      timeout: 10_000,
    });
  }
}

/** Navigate to home and dismiss the anonymous login sheet when present. */
export async function gotoHome(page: Page): Promise<void> {
  await installE2eBrowserSession(page);
  await page.goto('/');
  await dismissLoginModalIfOpen(page);
  await expect(page.locator('[data-bottom-sheet-backdrop][data-open="true"]')).toHaveCount(0, {
    timeout: 5_000,
  });
}

export async function submitName(page: Page, name: string): Promise<void> {
  await expect(page.locator('[data-bottom-sheet-backdrop][data-open="true"]')).toBeVisible({
    timeout: 10_000,
  });
  const nameInput = page.getByTestId('enter-name');
  await nameInput.click();
  await nameInput.fill(name);
  await expect(page.getByTestId('enter-name-submit')).toBeEnabled({ timeout: 5_000 });
  await page.getByTestId('enter-name-submit').click();
  await expect(page.getByTestId('enter-name-screen')).toHaveCount(0, { timeout: 30_000 });
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
  await dismissLoginModalIfOpen(guest);
  await guest.getByTestId('menu-join-game').click();
  await guest.getByTestId('menu-quick-join-code').fill(roomCode);
  await guest.getByTestId('menu-quick-join-submit').click();
  await submitName(guest, name);
  await expect(guest.getByTestId('lobby-room-code')).toHaveText(roomCode, { timeout: 30_000 });
}

/** Switch host lobby from default SOLO to TEAMS so TeamCard join controls render. */
export async function ensureTeamsMode(page: Page): Promise<void> {
  const bar = page.getByTestId('lobby-play-mode-bar');
  await expect(bar).toBeVisible({ timeout: 15_000 });
  const teamsBtn = page.getByRole('button', { name: teamsModeRe });
  if ((await teamsBtn.count()) === 0) {
    // Guest sees read-only format — host must switch mode first.
    return;
  }
  if ((await teamsBtn.getAttribute('aria-pressed')) !== 'true') {
    await teamsBtn.scrollIntoViewIfNeeded();
    await teamsBtn.click();
    await expect(page.getByRole('button', { name: joinTeamRe }).first()).toBeVisible({
      timeout: 15_000,
    });
  }
}

/** Host → team 0, guest → team 1. */
/** Join a team card by index (0-based). */
export async function joinTeam(page: Page, teamIndex: number): Promise<void> {
  await page.getByRole('button', { name: joinTeamRe }).nth(teamIndex).click();
}

export async function assignDistinctTeams(host: Page, guest: Page): Promise<void> {
  await joinTeam(host, 0);
  await joinTeam(guest, 1);
}

/** Host lobby visible (online or offline) — not on Settings or in-game screens. */
export async function expectLobbyScreen(page: Page): Promise<void> {
  await expect(page.getByTestId('settings-close')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByTestId('lobby-start-panel')).toBeVisible({ timeout: 15_000 });
}

export async function expectLobbyReadiness(page: Page, opts: { ready: boolean }): Promise<void> {
  if (opts.ready) {
    const startBtn = lobbyStartButton(page);
    await expect(startBtn).toBeVisible({ timeout: 15_000 });
    await expect(startBtn).not.toHaveAttribute('aria-disabled', 'true', { timeout: 15_000 });
    await expect(page.getByTestId('lobby-readiness-bar')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('lobby-start-btn-shell')).toHaveClass(
      /accent-footer-cta-shell--ready/,
      {
        timeout: 15_000,
      }
    );
  } else {
    const startBtn = page.getByTestId('lobby-start-btn');
    await expect(startBtn).toHaveAttribute('aria-disabled', 'true', { timeout: 15_000 });
    await expect(page.getByTestId('lobby-start-btn-shell')).toHaveClass(
      /accent-footer-cta-shell--blocked/,
      { timeout: 15_000 }
    );
    await expect(page.getByTestId('lobby-readiness-bar')).toHaveCount(0);
  }
}

export async function expectLobbyReadyToStart(page: Page): Promise<void> {
  await expectLobbyReadiness(page, { ready: true });
}

export async function createTwoPlayerLobby(browser: Browser): Promise<TwoPlayerSession> {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await installE2eBrowserSession(host);
  await installE2eBrowserSession(guest);

  await gotoHome(host);
  await host.getByTestId('menu-create-game').click();
  await submitName(host, HOST_NAME);
  const roomCode = await readRoomCode(host);
  await guestJoinByCode(guest, roomCode);
  await ensureTeamsMode(host);
  await assignDistinctTeams(host, guest);
  await expectLobbyReadyToStart(host);

  return { hostContext, guestContext, host, guest, roomCode };
}

export async function closeTwoPlayerSession(session: TwoPlayerSession): Promise<void> {
  await session.hostContext.close().catch(() => undefined);
  await session.guestContext.close().catch(() => undefined);
}

export async function startFromLobby(host: Page): Promise<void> {
  await expectLobbyReadyToStart(host);
  const startBtn = lobbyStartButton(host);
  await clickFixedChrome(startBtn);
  const vs = host.getByText('VS', { exact: true });
  if (await vs.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await clickFixedChrome(startBtn);
  }
}

export async function startRoundToPlaying(host: Page, guest?: Page): Promise<void> {
  await startFromLobby(host);
  const readyBtn = host.getByRole('button', { name: imReadyRe });
  await expect(readyBtn).toBeVisible({ timeout: 45_000 });
  await clickFixedChrome(readyBtn);
  await expect(host.getByRole('button', { name: correctRe })).toBeVisible({ timeout: 90_000 });
  if (guest) {
    // Opposing-team guest: guesser UI or (if still on pre-round) playing-now title.
    await expect(
      guest
        .getByText(guestGuessRe)
        .or(guest.getByText(playingNowRe))
        .or(guest.getByRole('button', { name: correctRe }))
    ).toBeVisible({
      timeout: 30_000,
    });
  }
}

export async function tapCorrect(page: Page, times = 1): Promise<void> {
  const btn = page.getByRole('button', { name: correctRe });
  for (let i = 0; i < times; i++) {
    await btn.click();
    // PlayingScreen ACTION_DEBOUNCE_MS = 140; leave headroom for socket round-trip.
    if (i < times - 1) {
      await page.waitForTimeout(200);
    }
  }
}

export async function waitForRoundSummary(page: Page, timeoutMs = 45_000): Promise<void> {
  await expect(page.getByTestId('round-summary')).toBeVisible({ timeout: timeoutMs });
}

export async function confirmRoundSummary(host: Page): Promise<void> {
  await host.getByRole('button', { name: continueRe }).click();
}

export async function openLobbySettings(page: Page): Promise<void> {
  await forceBrowserChromeMode(page);
  const chips = page.getByTestId('lobby-settings-chips');
  await chips.scrollIntoViewIfNeeded();
  await expect(chips).toBeVisible({ timeout: 15_000 });
  await chips.click();
  await expect(page.getByTestId('settings-close')).toBeVisible({ timeout: 15_000 });
}

/** Round time / score-to-win live under Settings → Rules (default tab is Mode). */
export async function openLobbySettingsRulesTab(page: Page): Promise<void> {
  await openLobbySettings(page);
  const rulesTab = page.getByRole('tab', { name: lobbySettingsRulesTabRe, exact: true });
  await rulesTab.scrollIntoViewIfNeeded();
  await rulesTab.click();
  await expect(page.getByRole('button', { name: lobbyRulesBasicsRe })).toBeVisible({
    timeout: 10_000,
  });
}

export async function closeLobbySettings(page: Page): Promise<void> {
  await forceBrowserChromeMode(page);
  const closeBtn = page.getByTestId('settings-close');
  const appBack = page.getByTestId('app-header-back');
  if (await closeBtn.isVisible().catch(() => false)) {
    await clickFixedChrome(closeBtn);
  } else if (await appBack.isVisible().catch(() => false)) {
    await clickFixedChrome(appBack);
  } else {
    throw new Error('closeLobbySettings: no browser back control visible');
  }
  await expectLobbyScreen(page);
}

export async function setLobbyGameModeImposter(host: Page): Promise<void> {
  await openLobbySettings(host);
  await host.getByRole('button', { name: /Imposter|Імпостер/i }).click();
  await closeLobbySettings(host);
}

export async function lockTeams(host: Page): Promise<void> {
  const lockBtn = host.getByRole('button', { name: lockTeamsRe });
  await lockBtn.scrollIntoViewIfNeeded();
  await lockBtn.click();
}

export const nextRoundRe = /Раунд|Round|Runde/i;

function offlineAddPlayerModal(page: Page) {
  return page.getByTestId('add-player-modal');
}

export async function addOfflinePlayer(page: Page, name: string): Promise<void> {
  const addBtn = page.getByTestId('lobby-add-player-trigger');
  await addBtn.scrollIntoViewIfNeeded();
  await expect(addBtn).toBeEnabled({ timeout: 5_000 });
  await addBtn.click();

  const modal = offlineAddPlayerModal(page);
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await modal.locator('input').fill(name);
  await modal.getByRole('button', { name: addConfirmRe }).click();
  await expect(modal).toBeHidden({ timeout: 10_000 });
}

function offlineAssignPlayerDialog(page: Page, playerName: string) {
  return page.getByRole('dialog').filter({
    has: page.getByText(playerName, { exact: true }),
  });
}

export async function assignOfflinePlayerToTeam(
  page: Page,
  playerName: string,
  teamIndex: number
): Promise<void> {
  const assignBtn = assignPlayerButton(page, playerName);
  await assignBtn.scrollIntoViewIfNeeded();
  await assignBtn.click();
  const dialog = offlineAssignPlayerDialog(page, playerName);
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.locator('.space-y-2 > button').nth(teamIndex).click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
}

export async function startOfflineLobby(page: Page, hostName = 'Offline Host'): Promise<void> {
  await gotoHome(page);
  await page.getByTestId('menu-offline').click();
  await submitName(page, hostName);
  await addOfflinePlayer(page, 'Offline Guest');
  await ensureTeamsMode(page);
  await page.getByRole('button', { name: joinTeamRe }).first().click();
  await assignOfflinePlayerToTeam(page, 'Offline Guest', 1);
  await expectLobbyReadyToStart(page);
}

export async function setMinimumRoundTime(host: Page): Promise<void> {
  await openLobbySettingsRulesTab(host);
  const basics = host.getByRole('button', { name: lobbyRulesBasicsRe });
  const minus = host.getByRole('button', { name: roundTimeMinusButtonRe });
  if (!(await minus.isVisible().catch(() => false))) {
    await basics.click();
  }
  await expect(minus).toBeVisible({ timeout: 10_000 });
  // Default 60s → UI floor 30s (SettingsScreen Math.max(30, …)).
  for (let i = 0; i < 3; i++) {
    await minus.click();
  }
  await closeLobbySettings(host);
}

export async function lowerScoreToWin(host: Page, target = 10): Promise<void> {
  const clampedTarget = Math.max(10, target);
  await openLobbySettingsRulesTab(host);
  const basics = host.getByRole('button', { name: lobbyRulesBasicsRe });
  const scoreValue = host.getByTestId('settings-score-to-win');
  const minusBtn = host.getByRole('button', { name: scoreToWinMinusRe });
  if (!(await scoreValue.isVisible().catch(() => false))) {
    await basics.click();
  }
  await expect(scoreValue).toBeVisible({ timeout: 10_000 });
  await expect(minusBtn).toBeVisible({ timeout: 10_000 });
  while (Number((await scoreValue.textContent())?.trim()) > clampedTarget) {
    await minusBtn.click();
  }
  await expect(scoreValue).toHaveText(String(clampedTarget), {
    timeout: 10_000,
  });
  await closeLobbySettings(host);
}
