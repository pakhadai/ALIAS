import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CSS_VAR_APP_PAGE_HEADER_HEIGHT } from '../../constants/tmaLayoutConstants';
import {
  AppHeader,
  APP_HEADER_DOCUMENT_FLAG,
  GlassAppHeader,
  UI_APP_HEADER_CHILD_ROW_CLASS,
  UI_APP_HEADER_CLASS,
  UI_APP_HEADER_FIXED_CLASS,
  UI_APP_HEADER_TITLE_ROW_CLASS,
} from './GlassAppHeader';

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

  /** Simulate a resize notification with the given border-box height */
  emit(height: number): void {
    const target = document.querySelector('header');
    if (!target) return;

    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          height,
          width: 375,
          top: 0,
          left: 0,
          right: 375,
          bottom: height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    this.callback([], this as unknown as ResizeObserver);
  }
}

function readAppPageHeaderHeight(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(CSS_VAR_APP_PAGE_HEADER_HEIGHT)
    .trim();
}

const isTelegramMiniApp = vi.fn(() => false);

vi.mock('../../hooks/useTelegramApp', () => ({
  isTelegramMiniApp: () => isTelegramMiniApp(),
}));

describe('GlassAppHeader', () => {
  beforeEach(() => {
    MockResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    delete document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG];
    document.documentElement.style.removeProperty(CSS_VAR_APP_PAGE_HEADER_HEIGHT);
    vi.unstubAllGlobals();
  });

  it('should flag the document so toasts render below the header bar', () => {
    const { unmount } = render(
      <GlassAppHeader>
        <span>Title</span>
      </GlassAppHeader>
    );

    expect(document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG]).toBe('true');

    unmount();
    expect(document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG]).toBeUndefined();
  });

  it('should be a full-width glass bar with content-safe title row (no device-only top pad)', () => {
    const { container } = render(
      <GlassAppHeader>
        <span data-testid="inner">Title</span>
      </GlassAppHeader>
    );

    const header = container.querySelector('header');
    expect(header?.className).toContain(UI_APP_HEADER_CLASS);
    expect(header?.className).not.toContain('pt-device-top');
    expect(header?.className).toContain('flex-col');
    expect(header?.className).not.toContain('rounded-3xl');
    expect(screen.getByTestId('inner')).toBeTruthy();
  });

  it('should publish measured height to --app-page-header-height via ResizeObserver', () => {
    render(
      <GlassAppHeader>
        <span>Title</span>
      </GlassAppHeader>
    );

    const observer = MockResizeObserver.instances[0];
    expect(observer).toBeTruthy();
    expect(observer?.observe).toHaveBeenCalled();

    observer?.emit(112);
    expect(readAppPageHeaderHeight()).toBe('112px');
  });

  it('should clear --app-page-header-height on unmount', () => {
    const { unmount } = render(
      <GlassAppHeader>
        <span>Title</span>
      </GlassAppHeader>
    );

    MockResizeObserver.instances[0]?.emit(96);
    expect(readAppPageHeaderHeight()).toBe('96px');

    unmount();
    expect(readAppPageHeaderHeight()).toBe('');
    expect(MockResizeObserver.instances[0]?.disconnect).toHaveBeenCalled();
  });

  it('should apply fixed liquid glass modifier when fixed prop is true', () => {
    const { container } = render(
      <GlassAppHeader fixed>
        <span>Title</span>
      </GlassAppHeader>
    );

    expect(container.querySelector('header')?.className).toContain(UI_APP_HEADER_FIXED_CLASS);
  });

  it('should set data-tg-gutter when tgGutter prop is true', () => {
    const { container } = render(
      <GlassAppHeader tgGutter>
        <span>Title</span>
      </GlassAppHeader>
    );

    expect(container.querySelector('header')?.getAttribute('data-tg-gutter')).toBe('true');
  });
});

describe('AppHeader', () => {
  beforeEach(() => {
    MockResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    isTelegramMiniApp.mockReturnValue(false);
  });

  afterEach(() => {
    document.documentElement.style.removeProperty(CSS_VAR_APP_PAGE_HEADER_HEIGHT);
    vi.unstubAllGlobals();
  });

  it('should render left, center, and right slots in the glass bar', () => {
    render(
      <AppHeader
        data-testid="app-header"
        left={<span>Left</span>}
        center={<span>Center</span>}
        right={<span>Right</span>}
      />
    );

    const header = screen.getByTestId('app-header').closest('header');
    expect(header?.className).toContain(UI_APP_HEADER_CLASS);
    expect(header?.querySelector(`.${UI_APP_HEADER_TITLE_ROW_CLASS}`)).toBeTruthy();
    expect(screen.getByText('Left')).toBeTruthy();
    expect(screen.getByText('Center')).toBeTruthy();
    expect(screen.getByText('Right')).toBeTruthy();
  });

  it('should render title preset in center slot', () => {
    render(<AppHeader title={<span>Lobby title</span>} />);
    expect(screen.getByText('Lobby title')).toBeTruthy();
  });

  it('should show browser back button when onBack is provided outside TMA', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(<AppHeader title="Lobby" onBack={onBack} backAriaLabel="Exit" />);

    const backBtn = screen.getByTestId('app-header-back');
    expect(backBtn).toHaveAttribute('aria-label', 'Exit');

    await user.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should hide browser back button in TMA and apply tg gutter', () => {
    isTelegramMiniApp.mockReturnValue(true);

    const { container } = render(<AppHeader title="Lobby" onBack={vi.fn()} />);

    expect(screen.queryByTestId('app-header-back')).toBeNull();
    expect(container.querySelector('header')?.getAttribute('data-tg-gutter')).toBe('true');
  });

  it('should respect showBackInBrowser=false outside TMA', () => {
    render(<AppHeader title="Lobby" onBack={vi.fn()} showBackInBrowser={false} />);
    expect(screen.queryByTestId('app-header-back')).toBeNull();
  });

  it('should include child row in measured header height', () => {
    render(
      <AppHeader title="Lobby" childRowHeightPx={48}>
        <div data-testid="child-row">Tabs</div>
      </AppHeader>
    );

    expect(screen.getByTestId('child-row')).toBeTruthy();
    const childRow = document.querySelector(`.${UI_APP_HEADER_CHILD_ROW_CLASS}`);
    expect(childRow).toBeTruthy();

    MockResizeObserver.instances[0]?.emit(156);
    expect(readAppPageHeaderHeight()).toBe('156px');
  });
});
