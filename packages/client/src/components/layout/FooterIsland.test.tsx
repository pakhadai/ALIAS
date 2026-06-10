import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CSS_VAR_FOOTER_ISLAND_HEIGHT } from '../../constants/tmaLayoutConstants';
import { FOOTER_ISLAND_CLASS, FOOTER_ISLAND_DOCUMENT_FLAG, FooterIsland } from './FooterIsland';

type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();

  emit(heightPx: number): void {
    const footer = document.querySelector('footer.footer-island');
    if (footer) {
      Object.defineProperty(footer, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          height: heightPx,
          width: 320,
          top: 0,
          left: 0,
          right: 320,
          bottom: heightPx,
        }),
      });
    }
    this.callback([], this as unknown as ResizeObserver);
  }
}

describe('FooterIsland', () => {
  beforeEach(() => {
    MockResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    delete document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG];
    document.documentElement.style.removeProperty(CSS_VAR_FOOTER_ISLAND_HEIGHT);
    vi.unstubAllGlobals();
  });

  it('should render a fixed glass island footer with children', () => {
    const { container } = render(
      <FooterIsland>
        <button type="button">Play</button>
      </FooterIsland>
    );

    const footer = container.querySelector('footer');
    expect(footer?.className).toContain(FOOTER_ISLAND_CLASS);
    expect(footer?.className).toContain('ui-app-footer');
    expect(footer?.className).toContain('items-stretch');
    expect(footer?.className).toContain('pointer-events-none');
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play' }).parentElement?.className).toContain(
      'pointer-events-auto'
    );
  });

  it('should flag the document for scroll clearance padding', () => {
    const { unmount } = render(
      <FooterIsland>
        <span>CTA</span>
      </FooterIsland>
    );

    expect(document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG]).toBe('true');
    unmount();
    expect(document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG]).toBeUndefined();
  });

  it('should publish measured height to --footer-island-height via ResizeObserver', () => {
    render(
      <FooterIsland>
        <span>CTA</span>
      </FooterIsland>
    );

    const observer = MockResizeObserver.instances[0];
    expect(observer).toBeTruthy();
    observer?.emit(128);

    expect(document.documentElement.style.getPropertyValue(CSS_VAR_FOOTER_ISLAND_HEIGHT)).toBe(
      '128px'
    );
  });

  it('should clear --footer-island-height on unmount', () => {
    const { unmount } = render(
      <FooterIsland>
        <span>CTA</span>
      </FooterIsland>
    );

    MockResizeObserver.instances[0]?.emit(96);
    unmount();

    expect(document.documentElement.style.getPropertyValue(CSS_VAR_FOOTER_ISLAND_HEIGHT)).toBe('');
    expect(MockResizeObserver.instances[0]?.disconnect).toHaveBeenCalled();
  });
});
