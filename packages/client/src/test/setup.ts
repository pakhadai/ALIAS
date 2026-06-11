import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.appHeader;
  delete document.documentElement.dataset.footerIsland;
  document.documentElement.style.removeProperty('--footer-island-height');
  document.getElementById('glass-chrome-portal-root')?.remove();
});

/** jsdom lacks ResizeObserver — GlassAppHeader measures header height on mount */
class ResizeObserverPolyfill {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    queueMicrotask(() => {
      this.callback(
        [
          {
            target,
            contentRect: target.getBoundingClientRect(),
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
          } as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver
      );
    });
  }

  disconnect(): void {}
  unobserve(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}
