import { useEffect, useMemo, useState } from 'react';
import {
  CSS_VAR_TMA_CONTENT_TOP_FLOOR,
  isTelegramDesktopPlatform,
  resolveTelegramContentTopFloorPx,
  TELEGRAM_DESKTOP_DOCUMENT_FLAG,
  TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX,
} from '../constants/tmaLayoutConstants';
import { applyGlassTheme } from '../lib/glassTheme';

export { isTelegramDesktopPlatform } from '../constants/tmaLayoutConstants';

function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}
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

function safeTelegramCall(fn: () => void): void {
  try {
    fn();
  } catch (_err) {
    void _err;
  }
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

/** Sync viewport + safe-area CSS vars from the live WebApp object (no extra bottom padding — uses `--tma-inset-*`). */
export function syncTelegramLayout(webApp: TelegramWebApp): void {
  applyTelegramViewportCssVars(webApp);
  applyTelegramSafeAreaCssVars(webApp);
}

/** Mobile: expand + fullscreen. Desktop: stay in Telegram window (no immersive fullscreen). */
function bootstrapTelegramViewport(webApp: TelegramWebApp): void {
  if (isTelegramDesktopPlatform(webApp.platform)) {
    safeTelegramCall(() => webApp.exitFullscreen?.());
    return;
  }
  safeTelegramCall(() => webApp.expand());
  safeTelegramCall(() => webApp.requestFullscreen?.());
}

/** Re-expand after viewport changes when the SDK reports a collapsed WebView (mobile only). */
export function ensureTelegramExpanded(webApp: TelegramWebApp): void {
  if (isTelegramDesktopPlatform(webApp.platform)) {
    if (webApp.isFullscreen === true) {
      safeTelegramCall(() => webApp.exitFullscreen?.());
    }
    return;
  }
  if (webApp.isExpanded !== true) {
    safeTelegramCall(() => webApp.expand());
    safeTelegramCall(() => webApp.requestFullscreen?.());
  }
}

let tmaBootstrapDone = false;

/**
 * Synchronous TMA bootstrap — call before `createRoot` (index.tsx) for earliest `ready()` / layout vars.
 * Idempotent; hook `useEffect` re-invokes safely for test-only mounts.
 */
export function bootstrapTelegramMiniApp(): boolean {
  const webApp = getTelegramWebApp();
  if (!webApp || !hasTelegramInitData()) return false;
  if (tmaBootstrapDone) return true;

  tmaBootstrapDone = true;

  const contentTopFloorPx = resolveTelegramContentTopFloorPx(webApp.platform);
  const isDesktop = isTelegramDesktopPlatform(webApp.platform);

  document.documentElement.setAttribute('data-telegram-app', 'true');
  document.documentElement.style.setProperty(
    CSS_VAR_TMA_CONTENT_TOP_FLOOR,
    `${contentTopFloorPx}px`
  );
  if (isDesktop) {
    document.documentElement.dataset[TELEGRAM_DESKTOP_DOCUMENT_FLAG] = 'true';
  } else {
    delete document.documentElement.dataset[TELEGRAM_DESKTOP_DOCUMENT_FLAG];
  }

  safeTelegramCall(() => webApp.ready());
  bootstrapTelegramViewport(webApp);
  safeTelegramCall(() => webApp.disableVerticalSwipes?.());
  safeTelegramCall(() => webApp.enableClosingConfirmation?.());

  syncTelegramLayout(webApp);
  requestAnimationFrame(() => syncTelegramLayout(webApp));

  applyTelegramThemeCssVars(webApp.themeParams ?? null);
  applyGlassTheme(webApp.colorScheme ?? null);

  return true;
}

/** @internal Vitest-only — reset module bootstrap guard between cases. */
export function resetTelegramBootstrapForTests(): void {
  tmaBootstrapDone = false;
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
  /** Real Telegram session only — plain browser loads SDK stub with empty initData. */
  const isTelegram = hasTelegramInitData();
  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || null;

  const [themeParams, setThemeParams] = useState<TelegramWebAppThemeParams | null>(
    webApp?.themeParams ?? null
  );
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | null>(
    webApp?.colorScheme ?? null
  );

  // Event subscriptions + late layout sync — bootstrap runs sync in index.tsx / bootstrapTelegramMiniApp().
  useEffect(() => {
    if (!webApp || !hasTelegramInitData()) return;

    bootstrapTelegramMiniApp();

    const syncLayout = () => {
      syncTelegramLayout(webApp);
    };

    const handleViewportChanged = () => {
      ensureTelegramExpanded(webApp);
      syncLayout();
    };

    const handleInsetsChanged = () => {
      syncLayout();
    };

    const insetSyncRaf = requestAnimationFrame(() => syncLayout());
    const lateSync80 = window.setTimeout(syncLayout, 80);
    const lateSync150 = window.setTimeout(syncLayout, 150);
    const lateSync300 = window.setTimeout(syncLayout, 300);

    const handleThemeChanged = () => {
      setThemeParams(webApp.themeParams ?? null);
      setColorScheme(webApp.colorScheme ?? null);
      applyTelegramThemeCssVars(webApp.themeParams ?? null);
      applyGlassTheme(webApp.colorScheme ?? null);
    };

    webApp.onEvent?.('themeChanged', handleThemeChanged);
    webApp.onEvent?.('safeAreaChanged', handleInsetsChanged);
    webApp.onEvent?.('contentSafeAreaChanged', handleInsetsChanged);
    webApp.onEvent?.('fullscreenChanged', handleInsetsChanged);
    webApp.onEvent?.('viewportChanged', handleViewportChanged);

    return () => {
      window.clearTimeout(lateSync80);
      window.clearTimeout(lateSync150);
      window.clearTimeout(lateSync300);
      cancelAnimationFrame(insetSyncRaf);
      webApp.offEvent?.('themeChanged', handleThemeChanged);
      webApp.offEvent?.('safeAreaChanged', handleInsetsChanged);
      webApp.offEvent?.('contentSafeAreaChanged', handleInsetsChanged);
      webApp.offEvent?.('fullscreenChanged', handleInsetsChanged);
      webApp.offEvent?.('viewportChanged', handleViewportChanged);
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
