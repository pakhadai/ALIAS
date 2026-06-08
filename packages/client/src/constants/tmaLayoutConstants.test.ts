import { describe, expect, it } from 'vitest';
import {
  APP_HEADER_BAR_PX,
  APP_HEADER_BAR_REM,
  CSS_VAR_APP_PAGE_HEADER_HEIGHT,
  HEADER_ROW_MIN_PX,
  HOME_CARD_TOP_GAP_PX,
  TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX,
  TG_CHROME_GUTTER_PX,
  appPageHeaderHeightFallbackCss,
  appPageHeaderHeightInsetFallbackCss,
  appHomeCardTopCss,
  pxToRem,
  titleRowHeightCss,
  tmaInsetTopCss,
} from './tmaLayoutConstants';

describe('tmaLayoutConstants', () => {
  it('should match Phase 1 SSOT pixel values', () => {
    expect(HEADER_ROW_MIN_PX).toBe(44);
    expect(TG_CHROME_GUTTER_PX).toBe(80);
    expect(APP_HEADER_BAR_PX).toBe(60);
    expect(TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX).toBe(88);
    expect(HOME_CARD_TOP_GAP_PX).toBe(16);
    expect(CSS_VAR_APP_PAGE_HEADER_HEIGHT).toBe('--app-page-header-height');
  });

  it('should convert bar height to rem', () => {
    expect(pxToRem(APP_HEADER_BAR_PX)).toBe('3.75rem');
    expect(APP_HEADER_BAR_REM).toBe('3.75rem');
  });

  it('should build title row height CSS with content-safe floor', () => {
    expect(titleRowHeightCss()).toBe(
      'max(calc(var(--tg-content-safe-area-inset-top, 88px) - var(--tma-device-inset-top, 0px)), 44px)'
    );
  });

  it('should build total header fallback with optional child row', () => {
    expect(appPageHeaderHeightFallbackCss()).toBe(
      'calc(max(calc(var(--tg-content-safe-area-inset-top, 88px) - var(--tma-device-inset-top, 0px)), 44px) + var(--tma-device-inset-top, 0px) + 60px)'
    );
    expect(appPageHeaderHeightFallbackCss(44)).toContain('+ 44px)');
  });

  it('should build inset-aligned fallback for current GlassAppHeader', () => {
    expect(appPageHeaderHeightInsetFallbackCss()).toBe(
      'calc(var(--tma-inset-top, 88px) + 3.75rem)'
    );
  });

  it('should build home card top offset CSS', () => {
    expect(appHomeCardTopCss()).toBe('calc(var(--tg-content-safe-area-inset-top, 88px) + 16px)');
  });

  it('should build tma inset top CSS with content floor var fallback', () => {
    expect(tmaInsetTopCss()).toBe(
      'var(--tg-content-safe-area-inset-top, var(--tma-content-top-floor, 88px))'
    );
  });
});
