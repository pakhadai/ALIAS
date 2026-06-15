/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  /** Injected from `packages/client/package.json` in `vite.config.ts` / `vitest.config.ts`. */
  const __APP_VERSION__: string;

  type TelegramWebAppUser = {
    id: number;
    is_bot?: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };

  type TelegramWebAppThemeParams = Partial<{
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
    secondary_bg_color: string;
  }>;

  type TelegramWebAppInitDataUnsafe = Partial<{
    query_id: string;
    user: TelegramWebAppUser;
    receiver: TelegramWebAppUser;
    start_param: string;
    auth_date: number;
    hash: string;
  }>;

  type TelegramSafeAreaInset = Partial<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  }>;

  type TelegramWebApp = {
    /** May be empty before auth or in some embed contexts. */
    initData?: string;
    initDataUnsafe?: TelegramWebAppInitDataUnsafe;
    themeParams: TelegramWebAppThemeParams;
    colorScheme: 'light' | 'dark';
    /** Present in real Mini App clients (e.g. ios, android, macos, web, webrtc, unknown). */
    platform?: string;
    /** Current viewport height in px (SDK). */
    viewportHeight?: number;
    /** Recommended layout height in px — avoids UI chrome jump (SDK). */
    viewportStableHeight?: number;
    /** Device notch / system bars — mirrored as `var(--tg-safe-area-inset-*)` by the SDK */
    safeAreaInset?: TelegramSafeAreaInset;
    /** Insets avoiding Telegram chrome (header, etc.) — `var(--tg-content-safe-area-inset-*)` */
    contentSafeAreaInset?: TelegramSafeAreaInset;
    isFullscreen?: boolean;
    /** False when the Mini App is collapsible and not yet expanded to full height (SDK). */
    isExpanded?: boolean;
    ready: () => void;
    expand: () => void;
    close: () => void;
    /** Syncs Mini App header chrome and status-bar icon contrast with the given color. */
    setHeaderColor?: (color: string) => void;
    /** Syncs Telegram wrapper background with the page theme. */
    setBackgroundColor?: (color: string) => void;
    requestFullscreen?: () => void;
    exitFullscreen?: () => void;
    disableVerticalSwipes?: () => void;
    enableClosingConfirmation?: () => void;
    BackButton?: {
      show: () => void;
      hide: () => void;
      onClick: (cb: () => void) => void;
      offClick?: (cb: () => void) => void;
    };
    HapticFeedback?: {
      impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
      notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
      selectionChanged: () => void;
    };
    openInvoice?: (
      url: string,
      cb?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void
    ) => void;
    onEvent?: (eventType: string, eventHandler: () => void) => void;
    offEvent?: (eventType: string, eventHandler: () => void) => void;
  };

  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }

  interface ImportMetaEnv {
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_SENTRY_RELEASE?: string;
    /** Canonical public PWA URL for lobby QR / copy-link invites (optional). */
    readonly VITE_PUBLIC_APP_URL?: string;
  }
}

export {};
