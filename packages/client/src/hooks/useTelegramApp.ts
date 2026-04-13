import { useEffect, useMemo, useState } from 'react';

function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export type UseTelegramAppResult = {
  isTelegram: boolean;
  webApp: TelegramWebApp | null;
  initData: string | null;
  initDataUnsafe: TelegramWebAppInitDataUnsafe | null;
  user: TelegramWebAppUser | null;
  themeParams: TelegramWebAppThemeParams | null;
  colorScheme: 'light' | 'dark' | null;
  close: () => void;
};

export function useTelegramApp(): UseTelegramAppResult {
  const webApp = getTelegramWebApp();

  const [themeParams, setThemeParams] = useState<TelegramWebAppThemeParams | null>(
    webApp?.themeParams ?? null
  );
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | null>(
    webApp?.colorScheme ?? null
  );

  useEffect(() => {
    if (!webApp) return;

    document.documentElement.setAttribute('data-telegram-app', 'true');

    webApp.ready();
    webApp.expand();
    webApp.requestFullscreen?.();
    webApp.disableVerticalSwipes?.();
    webApp.enableClosingConfirmation?.();

    const handleThemeChanged = () => {
      setThemeParams(webApp.themeParams ?? null);
      setColorScheme(webApp.colorScheme ?? null);
    };

    webApp.onEvent?.('themeChanged', handleThemeChanged);

    return () => {
      webApp.offEvent?.('themeChanged', handleThemeChanged);
    };
  }, [webApp]);

  return useMemo(
    () => ({
      isTelegram: Boolean(webApp),
      webApp,
      initData: webApp?.initData ?? null,
      initDataUnsafe: webApp?.initDataUnsafe ?? null,
      user: webApp?.initDataUnsafe?.user ?? null,
      themeParams,
      colorScheme,
      close: () => {
        webApp?.close();
      },
    }),
    [colorScheme, themeParams, webApp]
  );
}
