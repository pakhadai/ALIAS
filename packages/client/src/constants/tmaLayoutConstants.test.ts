import { describe, expect, it } from 'vitest';
import {
  APP_HEADER_BAR_PX,
  APP_HEADER_BAR_REM,
  CSS_VAR_APP_PAGE_HEADER_HEIGHT,
  HEADER_ROW_MIN_PX,
  HOME_CARD_TOP_GAP_PX,
  resolveTelegramContentTopFloorPx,
  TELEGRAM_DESKTOP_CONTENT_TOP_FLOOR_PX,
  TELEGRAM_DESKTOP_DOCUMENT_FLAG,
  TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX,
  TG_CHROME_GUTTER_PX,
  appPageHeaderHeightFallbackCss,
  appPageHeaderHeightInsetFallbackCss,
  appHomeCardTopCss,
  isTelegramDesktopPlatform,
  pxToRem,
  titleRowHeightCss,
  tmaInsetTopCss,
} from './tmaLayoutConstants';

describe('tmaLayoutConstants', () => {
  it('should match Phase 1 SSOT pixel values', () => {
    expect(HEADER_ROW_MIN_PX).toBe(44);
    expect(TG_CHROME_GUTTER_PX).toBe(80);
    expect(APP_HEADER_BAR_PX).toBe(60);
    expect(TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX).toBe(104);
    expect(HOME_CARD_TOP_GAP_PX).toBe(16);
    expect(CSS_VAR_APP_PAGE_HEADER_HEIGHT).toBe('--app-page-header-height');
  });

  it('should convert bar height to rem', () => {
    expect(pxToRem(APP_HEADER_BAR_PX)).toBe('3.75rem');
    expect(APP_HEADER_BAR_REM).toBe('3.75rem');
  });

  it('should build title row height CSS from content-safe top only', () => {
    expect(titleRowHeightCss()).toBe('max(var(--tma-content-safe-top, 104px), 44px)');
  });

  it('should build total header fallback with optional child row', () => {
    expect(appPageHeaderHeightFallbackCss()).toBe(
      'calc(max(var(--tma-content-safe-top, 104px), 44px))'
    );
    expect(appPageHeaderHeightFallbackCss(44)).toContain('+ 44px)');
  });

  it('should build inset-aligned fallback matching title row height', () => {
    expect(appPageHeaderHeightInsetFallbackCss()).toBe(
      'max(var(--tma-content-safe-top, 104px), 44px)'
    );
  });

  it('should build home card top offset CSS', () => {
    expect(appHomeCardTopCss()).toBe('calc(var(--tma-content-safe-top, 104px) + 16px)');
  });

  it('should build tma inset top CSS with content floor var fallback', () => {
    expect(tmaInsetTopCss()).toBe(
      'var(--tma-content-safe-top, var(--tma-content-top-floor, 104px))'
    );
  });

  it('should resolve content top floor by platform', () => {
    expect(TELEGRAM_DESKTOP_CONTENT_TOP_FLOOR_PX).toBe(0);
    expect(TELEGRAM_DESKTOP_DOCUMENT_FLAG).toBe('telegramDesktop');
    expect(resolveTelegramContentTopFloorPx('tdesktop')).toBe(0);
    expect(resolveTelegramContentTopFloorPx('ios')).toBe(104);
    expect(resolveTelegramContentTopFloorPx(undefined)).toBe(104);
  });

  it('should detect desktop Telegram platforms', () => {
    expect(isTelegramDesktopPlatform('tdesktop')).toBe(true);
    expect(isTelegramDesktopPlatform('macos')).toBe(true);
    expect(isTelegramDesktopPlatform('ios')).toBe(false);
    expect(isTelegramDesktopPlatform('android')).toBe(false);
  });
});
