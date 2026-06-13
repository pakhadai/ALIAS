import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  BROWSER_SHELL_DOCUMENT_FLAG,
  CSS_VAR_BROWSER_CHROME_BOTTOM_INSET,
  CSS_VAR_BROWSER_CHROME_TOP_INSET,
  CSS_VAR_BROWSER_VISUAL_VIEWPORT_HEIGHT,
} from '../constants/tmaLayoutConstants';
import {
  clearBrowserShellViewportCssVars,
  shouldEnableBrowserShellViewport,
  syncBrowserShellViewportCssVars,
  useBrowserShellViewport,
} from './useBrowserShellViewport';

describe('syncBrowserShellViewportCssVars', () => {
  beforeEach(() => {
    clearBrowserShellViewportCssVars();
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 712,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      writable: true,
      value: 712,
    });
  });

  it('should publish height and chrome insets from visual viewport', () => {
    syncBrowserShellViewportCssVars({ height: 712, offsetTop: 0 });

    expect(
      document.documentElement.style.getPropertyValue(CSS_VAR_BROWSER_VISUAL_VIEWPORT_HEIGHT)
    ).toBe('712px');
    expect(document.documentElement.style.getPropertyValue(CSS_VAR_BROWSER_CHROME_TOP_INSET)).toBe(
      '0px'
    );
    expect(
      document.documentElement.style.getPropertyValue(CSS_VAR_BROWSER_CHROME_BOTTOM_INSET)
    ).toBe('0px');
  });
});

describe('useBrowserShellViewport', () => {
  const mockVisualViewport = {
    height: 700,
    offsetTop: 12,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearBrowserShellViewportCssVars();
    delete document.documentElement.dataset[BROWSER_SHELL_DOCUMENT_FLAG];
    Object.defineProperty(window, 'Telegram', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      writable: true,
      value: mockVisualViewport,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 812,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      writable: true,
      value: 812,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it('should set data-browser-shell and viewport vars when enabled', async () => {
    renderHook(() => useBrowserShellViewport());
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    expect(document.documentElement.dataset[BROWSER_SHELL_DOCUMENT_FLAG]).toBe('true');
    expect(
      document.documentElement.style.getPropertyValue(CSS_VAR_BROWSER_VISUAL_VIEWPORT_HEIGHT)
    ).toBe('700px');
    expect(document.documentElement.style.getPropertyValue(CSS_VAR_BROWSER_CHROME_TOP_INSET)).toBe(
      '12px'
    );
    expect(
      document.documentElement.style.getPropertyValue(CSS_VAR_BROWSER_CHROME_BOTTOM_INSET)
    ).toBe('100px');
  });

  it('should clear browser shell attrs on unmount', () => {
    const { unmount } = renderHook(() => useBrowserShellViewport());
    unmount();

    expect(document.documentElement.dataset[BROWSER_SHELL_DOCUMENT_FLAG]).toBeUndefined();
    expect(
      document.documentElement.style.getPropertyValue(CSS_VAR_BROWSER_VISUAL_VIEWPORT_HEIGHT)
    ).toBe('');
  });

  it('should skip when Telegram initData is present', () => {
    Object.defineProperty(window, 'Telegram', {
      configurable: true,
      writable: true,
      value: { WebApp: { initData: 'signed' } },
    });

    renderHook(() => useBrowserShellViewport());

    expect(document.documentElement.dataset[BROWSER_SHELL_DOCUMENT_FLAG]).toBeUndefined();
    expect(shouldEnableBrowserShellViewport()).toBe(false);
  });
});
