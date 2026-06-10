export type GlassTheme = 'light' | 'dark';

/** Maps Telegram / app color scheme to `data-theme` for liquid glass CSS tokens. */
export function applyGlassTheme(colorScheme: GlassTheme | null | undefined): void {
  const root = document.documentElement;
  if (colorScheme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    return;
  }
  if (colorScheme === 'light') {
    root.setAttribute('data-theme', 'light');
    return;
  }
  root.removeAttribute('data-theme');
}

/** Subscribe to Telegram `themeChanged` — returns cleanup. */
export function subscribeGlassTheme(webApp: TelegramWebApp): () => void {
  const sync = () => {
    applyGlassTheme(webApp.colorScheme ?? null);
  };

  sync();
  webApp.onEvent?.('themeChanged', sync);

  return () => {
    webApp.offEvent?.('themeChanged', sync);
  };
}
