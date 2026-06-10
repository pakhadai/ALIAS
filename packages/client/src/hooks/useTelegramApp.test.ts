import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  CSS_VAR_TMA_CONTENT_TOP_FLOOR,
  TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX,
} from '../constants/tmaLayoutConstants';
import {
  bootstrapTelegramMiniApp,
  hasTelegramInitData,
  resetTelegramBootstrapForTests,
  useTelegramApp,
} from './useTelegramApp';

describe('useTelegramApp', () => {
  const eventHandlers = new Map<string, () => void>();

  const mockWebApp = {
    initData: 'test-init',
    platform: 'ios',
    initDataUnsafe: {},
    ready: vi.fn(),
    expand: vi.fn(),
    requestFullscreen: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    onEvent: vi.fn((eventType: string, handler: () => void) => {
      eventHandlers.set(eventType, handler);
    }),
    offEvent: vi.fn((eventType: string) => {
      eventHandlers.delete(eventType);
    }),
    themeParams: {},
    colorScheme: 'dark' as const,
    safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    viewportHeight: 800,
    viewportStableHeight: 800,
    isExpanded: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers.clear();
    resetTelegramBootstrapForTests();
    document.documentElement.removeAttribute('data-telegram-app');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty(CSS_VAR_TMA_CONTENT_TOP_FLOOR);
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      document.documentElement.style.removeProperty(`--tg-safe-area-inset-${side}`);
      document.documentElement.style.removeProperty(`--tg-content-safe-area-inset-${side}`);
    }
    document.documentElement.style.removeProperty('--tg-viewport-height');
    document.documentElement.style.removeProperty('--tg-viewport-stable-height');
    mockWebApp.isExpanded = true;
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
    resetTelegramBootstrapForTests();
  });

  it('should call ready and expand synchronously from bootstrapTelegramMiniApp', () => {
    const ok = bootstrapTelegramMiniApp();

    expect(ok).toBe(true);
    expect(mockWebApp.ready).toHaveBeenCalledTimes(1);
    expect(mockWebApp.expand).toHaveBeenCalledTimes(1);
    expect(mockWebApp.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(document.documentElement.getAttribute('data-telegram-app')).toBe('true');
    expect(document.documentElement.style.getPropertyValue(CSS_VAR_TMA_CONTENT_TOP_FLOOR)).toBe(
      `${TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX}px`
    );
    expect(document.documentElement.style.getPropertyValue('--tg-viewport-height')).toBe('800px');
  });

  it('should not repeat bootstrap side effects when called twice', () => {
    bootstrapTelegramMiniApp();
    bootstrapTelegramMiniApp();

    expect(mockWebApp.ready).toHaveBeenCalledTimes(1);
    expect(mockWebApp.expand).toHaveBeenCalledTimes(1);
  });

  it('should set data-telegram-app and content-top floor SSOT on hook mount', () => {
    bootstrapTelegramMiniApp();
    mockWebApp.ready.mockClear();

    renderHook(() => useTelegramApp());

    expect(document.documentElement.getAttribute('data-telegram-app')).toBe('true');
    expect(document.documentElement.style.getPropertyValue(CSS_VAR_TMA_CONTENT_TOP_FLOOR)).toBe(
      `${TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX}px`
    );
    expect(mockWebApp.ready).not.toHaveBeenCalled();
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

  it('should return true from hasTelegramInitData only when initData is non-empty', () => {
    bootstrapTelegramMiniApp();
    expect(hasTelegramInitData()).toBe(true);

    Object.defineProperty(window, 'Telegram', {
      configurable: true,
      writable: true,
      value: { WebApp: { ...mockWebApp, initData: '' } },
    });
    expect(hasTelegramInitData()).toBe(false);
  });

  it('should floor undersized SDK content-safe top inset to SSOT minimum', () => {
    mockWebApp.contentSafeAreaInset = { top: 46, bottom: 0, left: 0, right: 0 };

    renderHook(() => useTelegramApp());

    expect(
      document.documentElement.style.getPropertyValue('--tg-content-safe-area-inset-top')
    ).toBe(`${TELEGRAM_MOBILE_CONTENT_TOP_FLOOR_PX}px`);
  });

  it('should re-expand and sync viewport on viewportChanged when not expanded', () => {
    mockWebApp.isExpanded = false;
    bootstrapTelegramMiniApp();
    mockWebApp.expand.mockClear();
    mockWebApp.viewportHeight = 720;

    renderHook(() => useTelegramApp());

    const onViewportChanged = eventHandlers.get('viewportChanged');
    expect(onViewportChanged).toBeTypeOf('function');
    onViewportChanged?.();

    expect(mockWebApp.expand).toHaveBeenCalledTimes(1);
    expect(document.documentElement.style.getPropertyValue('--tg-viewport-height')).toBe('720px');
  });

  it('should skip expand on viewportChanged when already expanded', () => {
    mockWebApp.isExpanded = true;
    bootstrapTelegramMiniApp();
    mockWebApp.expand.mockClear();

    renderHook(() => useTelegramApp());

    eventHandlers.get('viewportChanged')?.();

    expect(mockWebApp.expand).not.toHaveBeenCalled();
  });
});
