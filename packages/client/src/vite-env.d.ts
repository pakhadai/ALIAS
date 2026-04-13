/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
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

  type TelegramWebApp = {
    initData: string;
    initDataUnsafe?: TelegramWebAppInitDataUnsafe;
    themeParams: TelegramWebAppThemeParams;
    colorScheme: 'light' | 'dark';
    ready: () => void;
    expand: () => void;
    close: () => void;
    requestFullscreen?: () => void;
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
  }
}

export {};
