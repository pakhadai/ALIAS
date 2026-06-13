/**
 * TMA layout dimensions SSOT — Phase 1 header unification.
 * Canon: docs/TMA_HEADER_UNIFICATION.md, docs/TMA_LAYOUT.md#constants
 */
export const HEADER_ROW_MIN_PX = 44;
export const TG_CHROME_GUTTER_PX = 80;
export const APP_HEADER_BAR_PX = 60;
/** Minimum content-safe top when SDK under-reports (Dynamic Island + TG chrome ≈ 96–104px). */
export const TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX = 104;
/** Desktop TMA — native title bar is outside WebView; trust SDK inset, floor is fallback only. */
export const TELEGRAM_DESKTOP_CONTENT_TOP_FLOOR_PX = 0;
/** `document.documentElement.dataset` key → `data-telegram-desktop` on `<html>`. */
export const TELEGRAM_DESKTOP_DOCUMENT_FLAG = 'telegramDesktop' as const;

const TELEGRAM_DESKTOP_PLATFORMS = new Set(['macos', 'tdesktop', 'weba', 'webk', 'web', 'unigram']);

export function isTelegramDesktopPlatform(platform?: string): boolean {
  if (!platform) return false;
  return TELEGRAM_DESKTOP_PLATFORMS.has(platform.toLowerCase());
}

/** Content-safe top floor by Telegram client — mobile 104px, desktop 0px (SDK-first). */
export function resolveTelegramContentTopFloorPx(platform?: string): number {
  return isTelegramDesktopPlatform(platform)
    ? TELEGRAM_DESKTOP_CONTENT_TOP_FLOOR_PX
    : TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX;
}

export const HOME_CARD_TOP_GAP_PX = 16;

/** Written by {@link GlassAppHeader} ResizeObserver; CSS fallback in `styles.css` */
export const CSS_VAR_APP_PAGE_HEADER_HEIGHT = '--app-page-header-height';

/** Minimum floating footer island height — {@link FooterIsland} ResizeObserver may publish taller values. */
export const FOOTER_ISLAND_MIN_PX = 68;

/** Written by {@link FooterIsland} ResizeObserver; CSS fallback in `glass.css` */
export const CSS_VAR_FOOTER_ISLAND_HEIGHT = '--footer-island-height';

/** Home card offset from viewport top — content-safe + gap; see `--app-home-card-top` in styles.css */
export const CSS_VAR_APP_HOME_CARD_TOP = '--app-home-card-top';

/** Mobile browser shell — written by {@link useBrowserShellViewport} from Visual Viewport API. */
export const CSS_VAR_BROWSER_VISUAL_VIEWPORT_HEIGHT = '--browser-visual-viewport-height';
export const CSS_VAR_BROWSER_CHROME_BOTTOM_INSET = '--browser-chrome-bottom-inset';
export const CSS_VAR_BROWSER_CHROME_TOP_INSET = '--browser-chrome-top-inset';
/** `document.documentElement.dataset` key → `data-browser-shell` on `<html>`. */
export const BROWSER_SHELL_DOCUMENT_FLAG = 'browserShell' as const;

const PX_PER_REM = 16;

/** `60px` → `3.75rem` at 16px root */
export function pxToRem(px: number): string {
  return `${px / PX_PER_REM}rem`;
}

export const APP_HEADER_BAR_REM = pxToRem(APP_HEADER_BAR_PX);

/**
 * Title row height (CSS calc fragment) — full `--tg-content-safe-area-inset-top` band.
 * Telegram centers native header controls in this zone; do not subtract device inset.
 */
export function titleRowHeightCss(
  contentFloorPx: number = TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX
): string {
  return `max(var(${CSS_VAR_TMA_CONTENT_SAFE_TOP}, ${contentFloorPx}px), ${HEADER_ROW_MIN_PX}px)`;
}

/**
 * Fallback `--app-page-header-height` before ResizeObserver measures the live header.
 * `titleRow [+ optional child row]`
 */
export function appPageHeaderHeightFallbackCss(extraChildRowPx = 0): string {
  const childSuffix = extraChildRowPx > 0 ? ` + ${extraChildRowPx}px` : '';
  return `calc(${titleRowHeightCss()}${childSuffix})`;
}

/** Legacy alias — same as {@link titleRowHeightCss} for inset-aligned spacers. */
export function appPageHeaderHeightInsetFallbackCss(
  contentFloorPx: number = TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX
): string {
  return titleRowHeightCss(contentFloorPx);
}

/** `--app-home-card-top` — content-safe top + home card gap (MenuScreen body padding). */
export function appHomeCardTopCss(
  contentFloorPx: number = TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX,
  gapPx: number = HOME_CARD_TOP_GAP_PX
): string {
  return `calc(var(${CSS_VAR_TMA_CONTENT_SAFE_TOP}, ${contentFloorPx}px) + ${gapPx}px)`;
}

/** CSS var name — synced from `useTelegramApp` on TMA bootstrap (Phase 5 floor). */
export const CSS_VAR_TMA_CONTENT_TOP_FLOOR = '--tma-content-top-floor';

/** Content-safe top with TMA floor — prefer over raw `--tg-content-safe-area-inset-top`. */
export const CSS_VAR_TMA_CONTENT_SAFE_TOP = '--tma-content-safe-top';

/**
 * `--tma-inset-top` — Telegram content-safe from viewport top (notch + native TG chrome).
 * TMA uses {@link CSS_VAR_TMA_CONTENT_TOP_FLOOR} fallback when SDK inset is absent (never write 0px inline).
 */
export function tmaInsetTopCss(
  contentFloorPx: number = TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX
): string {
  return `var(${CSS_VAR_TMA_CONTENT_SAFE_TOP}, var(${CSS_VAR_TMA_CONTENT_TOP_FLOOR}, ${contentFloorPx}px))`;
}
