import { test, expect } from '@playwright/test';

test.describe('@core Game flows', () => {
  test('create online room -> enter name -> lobby shows room code', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('menu-create-game').click();

    await page.getByTestId('enter-name').fill('Tester');
    await page.getByTestId('enter-name-submit').click();

    // Lobby should render a 5-digit room code
    const code = page.getByTestId('lobby-room-code');
    await expect(code).toBeVisible();
    await expect(code).toHaveText(/^\d{5}$/);
  });

  test('open join flow (menu -> join input) and can type code', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('menu-join-game').click();

    const input = page.getByTestId('join-room-code');
    await expect(input).toBeVisible();
    await input.fill('12ab3');
    await expect(input).toHaveValue('123');
  });

  test('offline mode starts and reaches name entry screen', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('menu-offline').click();

    await expect(page.getByTestId('enter-name')).toBeVisible();
  });
});

test.describe('@extended Multiplayer-ish flows', () => {
  test('host creates room, guest joins by code', async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest = await guestCtx.newPage();

    await host.goto('/');
    await host.getByTestId('menu-create-game').click();
    await host.getByTestId('enter-name').fill('Host');
    await host.getByTestId('enter-name-submit').click();

    const code = host.getByTestId('lobby-room-code');
    await expect(code).toBeVisible();
    const roomCode = (await code.textContent())?.trim() ?? '';
    expect(roomCode).toMatch(/^\d{5}$/);

    await guest.goto('/');
    await guest.getByTestId('menu-join-game').click();
    await guest.getByTestId('join-room-code').fill(roomCode);
    await guest.getByTestId('join-submit').click();
    await guest.getByTestId('enter-name').fill('Guest');
    await guest.getByTestId('enter-name-submit').click();

    await expect(guest.getByTestId('lobby-room-code')).toHaveText(roomCode);

    await hostCtx.close();
    await guestCtx.close();
  });
});
