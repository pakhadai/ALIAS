import { useEffect, useMemo, useState } from 'react';
import {
  CSS_VAR_TMA_CONTENT_TOP_FLOOR,
  TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX,
} from '../constants/tmaLayoutConstants';

function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

/** Same detection as `useTelegramApp().isTelegram` — use for UI only to avoid duplicate hook effects. */
export function isTelegramMiniApp(): boolean {
  const webApp = getTelegramWebApp();
  return Boolean(webApp && (webApp.initData || webApp.platform || webApp.initDataUnsafe));
}

/**
 * True only inside a real Telegram session (signed initData).
 * Plain browser loads `telegram-web-app.js` with `platform` stub but empty initData — no TG chrome gutter.
 */
export function hasTelegramInitData(): boolean {
  const initData = getTelegramWebApp()?.initData;
  return typeof initData === 'string' && initData.length > 0;
}

function applyTelegramThemeCssVars(theme: TelegramWebAppThemeParams | null): void {
  if (!theme) return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme)) {
    if (typeof value !== 'string' || value.length === 0) continue;
    const cssName = `--tg-theme-${key.replace(/_/g, '-')}`;
    root.style.setProperty(cssName, value);
  }
}

function insetPx(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function readCssVarPx(root: HTMLElement, name: string): number | null {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/** Ensures `--tg-*-safe-area-inset-*` exist (SDK usually sets them; some clients need a sync after fullscreen). */
function applyTelegramSafeAreaCssVars(webApp: TelegramWebApp): void {
  const root = document.documentElement;
  const contentTopFloor =
    readCssVarPx(root, CSS_VAR_TMA_CONTENT_TOP_FLOOR) ?? TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX;

  const applySide = (
    prefix: 'content-safe-area-inset' | 'safe-area-inset',
    inset: TelegramSafeAreaInset | null | undefined
  ) => {
    if (!inset) return;
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      let px = insetPx(inset[side]);
      // Never write 0px: inline styles on <html> override the SDK’s own --tg-* vars and can zero out a correct inset.
      if (px == null || px <= 0) continue;
      if (prefix === 'content-safe-area-inset' && side === 'top') {
        px = Math.max(px, contentTopFloor);
      }
      const cssVar = `--tg-${prefix}-${side}`;
      const existing = readCssVarPx(root, cssVar);
      // iOS can report a smaller JS value before contentSafeAreaChanged; keep the larger SDK/computed inset.
      if (existing != null && existing > px) continue;
      root.style.setProperty(cssVar, `${px}px`);
    }
  };
  applySide('safe-area-inset', webApp.safeAreaInset);
  applySide('content-safe-area-inset', webApp.contentSafeAreaInset);
}

/** Writes `--tg-viewport-height` / `--tg-viewport-stable-height` so CSS can match the WebView (not only `100vh`). */
function applyTelegramViewportCssVars(webApp: TelegramWebApp): void {
  const root = document.documentElement;
  const stable = webApp.viewportStableHeight;
  const current = webApp.viewportHeight;
  if (typeof stable === 'number' && stable > 0) {
    root.style.setProperty('--tg-viewport-stable-height', `${stable}px`);
  }
  if (typeof current === 'number' && current > 0) {
    root.style.setProperty('--tg-viewport-height', `${current}px`);
  }
}

export type UseTelegramAppResult = {
  isTelegram: boolean;
  webApp: TelegramWebApp | null;
  initData: string | null;
  initDataUnsafe: TelegramWebAppInitDataUnsafe | null;
  startParam: string | null;
  user: TelegramWebAppUser | null;
  themeParams: TelegramWebAppThemeParams | null;
  colorScheme: 'light' | 'dark' | null;
  close: () => void;
};

export function useTelegramApp(): UseTelegramAppResult {
  const webApp = getTelegramWebApp();
  /** Mini App: almost always has initData; still init UX when object exists (e.g. dev / delayed init). */
  const isTelegram = Boolean(
    webApp && (webApp.initData || webApp.platform || webApp.initDataUnsafe)
  );
  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || null;

  const [themeParams, setThemeParams] = useState<TelegramWebAppThemeParams | null>(
    webApp?.themeParams ?? null
  );
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | null>(
    webApp?.colorScheme ?? null
  );

  // TMA bootstrap — deferred: SDK init + viewport/safe-area event subscriptions (AUDIT D-4 / F-1).
  useEffect(() => {
    if (!webApp || !isTelegram) return;

    document.documentElement.setAttribute('data-telegram-app', 'true');
    document.documentElement.style.setProperty(
      CSS_VAR_TMA_CONTENT_TOP_FLOOR,
      `${TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX}px`
    );

    try {
      webApp.ready();
    } catch (_err) {
      void _err;
    }
    try {
      webApp.expand();
    } catch (_err) {
      void _err;
    }
    // Mini App fullscreen is expected in Telegram; SDK updates safe-area / viewport after this.
    // We hide the in-app browser fullscreen button in MenuScreen when `isTelegram`.
    try {
      webApp.requestFullscreen?.();
    } catch (_err) {
      void _err;
    }
    try {
      webApp.disableVerticalSwipes?.();
    } catch (_err) {
      void _err;
    }
    try {
      webApp.enableClosingConfirmation?.();
    } catch (_err) {
      void _err;
    }

    const syncLayout = () => {
      applyTelegramViewportCssVars(webApp);
      applyTelegramSafeAreaCssVars(webApp);
    };
    syncLayout();
    const insetSyncRaf = requestAnimationFrame(() => syncLayout());
    const lateSync80 = window.setTimeout(syncLayout, 80);
    const lateSync150 = window.setTimeout(syncLayout, 150);
    const lateSync300 = window.setTimeout(syncLayout, 300);

    const handleThemeChanged = () => {
      setThemeParams(webApp.themeParams ?? null);
      setColorScheme(webApp.colorScheme ?? null);
      // Theme vars may arrive a bit later than init; ensure CSS vars are applied.
      applyTelegramThemeCssVars(webApp.themeParams ?? null);
    };

    const handleInsetsChanged = () => {
      syncLayout();
    };

    webApp.onEvent?.('themeChanged', handleThemeChanged);
    webApp.onEvent?.('safeAreaChanged', handleInsetsChanged);
    webApp.onEvent?.('contentSafeAreaChanged', handleInsetsChanged);
    webApp.onEvent?.('fullscreenChanged', handleInsetsChanged);
    webApp.onEvent?.('viewportChanged', handleInsetsChanged);

    // Apply initial theme vars as soon as possible.
    applyTelegramThemeCssVars(webApp.themeParams ?? null);

    return () => {
      window.clearTimeout(lateSync80);
      window.clearTimeout(lateSync150);
      window.clearTimeout(lateSync300);
      cancelAnimationFrame(insetSyncRaf);
      webApp.offEvent?.('themeChanged', handleThemeChanged);
      webApp.offEvent?.('safeAreaChanged', handleInsetsChanged);
      webApp.offEvent?.('contentSafeAreaChanged', handleInsetsChanged);
      webApp.offEvent?.('fullscreenChanged', handleInsetsChanged);
      webApp.offEvent?.('viewportChanged', handleInsetsChanged);
    };
  }, [isTelegram, webApp]);

  return useMemo(
    () => ({
      isTelegram,
      webApp,
      initData: webApp?.initData ?? null,
      initDataUnsafe: webApp?.initDataUnsafe ?? null,
      startParam,
      user: webApp?.initDataUnsafe?.user ?? null,
      themeParams,
      colorScheme,
      close: () => {
        webApp?.close();
      },
    }),
    [colorScheme, isTelegram, startParam, themeParams, webApp]
  );
}
