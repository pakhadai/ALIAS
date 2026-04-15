import { useEffect, useMemo, useState } from 'react';

function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
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
  const isTelegram = Boolean(window.Telegram?.WebApp?.initData);
  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || null;

  const [themeParams, setThemeParams] = useState<TelegramWebAppThemeParams | null>(
    webApp?.themeParams ?? null
  );
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | null>(
    webApp?.colorScheme ?? null
  );

  useEffect(() => {
    if (!webApp || !isTelegram) return;

    document.documentElement.setAttribute('data-telegram-app', 'true');

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

    const handleThemeChanged = () => {
      setThemeParams(webApp.themeParams ?? null);
      setColorScheme(webApp.colorScheme ?? null);
      // Theme vars may arrive a bit later than init; ensure CSS vars are applied.
      applyTelegramThemeCssVars(webApp.themeParams ?? null);
    };

    webApp.onEvent?.('themeChanged', handleThemeChanged);

    const handleBackButtonClicked = () => {
      const ev = new CustomEvent('telegram-back', { cancelable: true });
      window.dispatchEvent(ev);
      if (ev.defaultPrevented) return;
      if (window.history.length > 1) {
        window.history.back();
      } else {
        webApp.close();
      }
    };

    try {
      webApp.BackButton?.show();
      webApp.onEvent?.('backButtonClicked', handleBackButtonClicked);
    } catch (_err) {
      void _err;
    }

    // Apply initial theme vars as soon as possible.
    applyTelegramThemeCssVars(webApp.themeParams ?? null);

    return () => {
      webApp.offEvent?.('themeChanged', handleThemeChanged);
      try {
        webApp.offEvent?.('backButtonClicked', handleBackButtonClicked);
      } catch (_err) {
        void _err;
      }
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
