import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  CSS_VAR_TMA_CONTENT_TOP_FLOOR,
  TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX,
} from '../constants/tmaLayoutConstants';
import { useTelegramApp } from './useTelegramApp';

describe('useTelegramApp', () => {
  const mockWebApp = {
    initData: 'test-init',
    platform: 'ios',
    initDataUnsafe: {},
    ready: vi.fn(),
    expand: vi.fn(),
    requestFullscreen: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    onEvent: vi.fn(),
    offEvent: vi.fn(),
    themeParams: {},
    colorScheme: 'dark' as const,
    safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    viewportHeight: 800,
    viewportStableHeight: 800,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-telegram-app');
    document.documentElement.style.removeProperty(CSS_VAR_TMA_CONTENT_TOP_FLOOR);
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      document.documentElement.style.removeProperty(`--tg-safe-area-inset-${side}`);
      document.documentElement.style.removeProperty(`--tg-content-safe-area-inset-${side}`);
    }
    Object.defineProperty(window, 'Telegram', {
      configurable: true,
      writable: true,
      value: { WebApp: mockWebApp },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'Telegram', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it('should set data-telegram-app and content-top floor SSOT on bootstrap', () => {
    renderHook(() => useTelegramApp());

    expect(document.documentElement.getAttribute('data-telegram-app')).toBe('true');
    expect(document.documentElement.style.getPropertyValue(CSS_VAR_TMA_CONTENT_TOP_FLOOR)).toBe(
      `${TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX}px`
    );
  });

  it('should not write 0px inline for zero SDK safe-area insets', () => {
    renderHook(() => useTelegramApp());

    expect(
      document.documentElement.style.getPropertyValue('--tg-content-safe-area-inset-top')
    ).toBe('');
    expect(document.documentElement.style.getPropertyValue('--tg-safe-area-inset-top')).toBe('');
  });

  it('should sync positive SDK content-safe inset without clobbering larger CSS value', () => {
    document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', '96px');
    mockWebApp.contentSafeAreaInset = { top: 72, bottom: 0, left: 0, right: 0 };

    renderHook(() => useTelegramApp());

    expect(
      document.documentElement.style.getPropertyValue('--tg-content-safe-area-inset-top')
    ).toBe('96px');
  });

  it('should floor undersized SDK content-safe top inset to SSOT minimum', () => {
    mockWebApp.contentSafeAreaInset = { top: 46, bottom: 0, left: 0, right: 0 };

    renderHook(() => useTelegramApp());

    expect(
      document.documentElement.style.getPropertyValue('--tg-content-safe-area-inset-top')
    ).toBe(`${TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX}px`);
  });
});
