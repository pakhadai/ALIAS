import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CSS_VAR_APP_PAGE_HEADER_HEIGHT } from '../../constants/tmaLayoutConstants';
import { SCREEN_LAYOUT } from '../../constants/screenLayout';
import { ScreenLayoutProvider } from '../../context/ScreenLayoutContext';
import {
  AppHeader,
  APP_HEADER_DOCUMENT_FLAG,
  GlassAppHeader,
  UI_APP_HEADER_CHILD_ROW_CLASS,
  UI_APP_HEADER_CLASS,
  UI_APP_HEADER_FIXED_CLASS,
  UI_APP_HEADER_TITLE_ROW_CLASS,
  UI_APP_HEADER_CONTENT_RAIL_CLASS,
  UI_GLASS_ICON_BTN_CLASS,
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

const hasTelegramInitData = vi.fn(() => false);

function stubTelegramWebApp(platform: string): void {
  window.Telegram = {
    WebApp: {
      platform,
      initData: 'stub',
    },
  } as typeof window.Telegram;
}

vi.mock('../../hooks/useTelegramApp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useTelegramApp')>();
  return {
    ...actual,
    hasTelegramInitData: () => hasTelegramInitData(),
  };
});

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
    expect(header?.className).toContain('pointer-events-none');
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
    hasTelegramInitData.mockReturnValue(false);
    delete window.Telegram;
  });

  afterEach(() => {
    document.documentElement.style.removeProperty(CSS_VAR_APP_PAGE_HEADER_HEIGHT);
    delete window.Telegram;
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

  it('should apply shell layout inset from ScreenLayoutContext', () => {
    hasTelegramInitData.mockReturnValue(false);

    const { container } = render(
      <ScreenLayoutProvider value={SCREEN_LAYOUT.fullPx4}>
        <AppHeader title="Lobby" onBack={vi.fn()} />
      </ScreenLayoutProvider>
    );

    const header = container.querySelector('header');
    expect(header?.style.getPropertyValue('--ui-screen-inline-padding')).toBe('1rem');
  });

  it('should show browser back button when onBack is provided outside TMA', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(<AppHeader title="Lobby" onBack={onBack} backAriaLabel="Exit" />);

    const backBtn = screen.getByTestId('app-header-back');
    expect(backBtn).toHaveAttribute('aria-label', 'Exit');
    expect(backBtn.querySelector(`.${UI_GLASS_ICON_BTN_CLASS}`)).toBeTruthy();
    expect(document.querySelector(`.${UI_APP_HEADER_CONTENT_RAIL_CLASS}`)).toBeTruthy();

    await user.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should show browser back when SDK stub exists but initData is empty', () => {
    hasTelegramInitData.mockReturnValue(false);

    render(<AppHeader title="Lobby" onBack={vi.fn()} />);

    expect(screen.getByTestId('app-header-back')).toBeTruthy();
  });

  it('should hide browser back button in TMA and apply tg gutter on mobile', () => {
    hasTelegramInitData.mockReturnValue(true);
    stubTelegramWebApp('ios');

    const { container } = render(<AppHeader title="Lobby" onBack={vi.fn()} />);

    expect(screen.queryByTestId('app-header-back')).toBeNull();
    expect(container.querySelector('header')?.getAttribute('data-tg-gutter')).toBe('true');
  });

  it('should omit tg gutter on Telegram Desktop even with initData', () => {
    hasTelegramInitData.mockReturnValue(true);
    stubTelegramWebApp('tdesktop');

    const { container } = render(<AppHeader title="Lobby" onBack={vi.fn()} />);

    expect(screen.queryByTestId('app-header-back')).toBeNull();
    expect(container.querySelector('header')?.getAttribute('data-tg-gutter')).toBeNull();
    expect(document.querySelector(`.${UI_APP_HEADER_CONTENT_RAIL_CLASS}`)).toBeTruthy();
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

  it('should always render browser overflow menu chip outside TMA even without menuItems', () => {
    render(<AppHeader title="Lobby" />);

    expect(screen.getByTestId('app-header-menu')).toBeTruthy();
    expect(screen.queryByTestId('app-header-menu-popover')).toBeNull();
  });

  it('should render browser overflow menu when menuItems are provided outside TMA', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <AppHeader
        title="Profile"
        onBack={vi.fn()}
        menuItems={[
          { id: 'a', label: 'Пункт 1', onSelect },
          { id: 'b', label: 'Пункт 2' },
        ]}
        menuAriaLabel="More actions"
      />
    );

    const menuBtn = screen.getByTestId('app-header-menu');
    expect(menuBtn).toHaveAttribute('aria-label', 'More actions');
    expect(menuBtn.querySelector(`.${UI_GLASS_ICON_BTN_CLASS}`)).toBeTruthy();
    expect(screen.queryByTestId('app-header-menu-popover')).toBeNull();

    await user.click(menuBtn);
    expect(screen.getByTestId('app-header-menu-popover')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Пункт 1' })).toBeTruthy();

    await user.click(screen.getByTestId('app-header-menu-item-a'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('app-header-menu-popover')).toBeNull();
  });

  it('should apply content rail when overflow menu is shown outside TMA', () => {
    const { container } = render(
      <ScreenLayoutProvider value={SCREEN_LAYOUT.fullPx4}>
        <AppHeader title="Store" onBack={vi.fn()} menuItems={[{ id: '1', label: 'Пункт 1' }]} />
      </ScreenLayoutProvider>
    );

    expect(container.querySelector(`.${UI_APP_HEADER_CONTENT_RAIL_CLASS}`)).toBeTruthy();
    expect(
      container.querySelector('header')?.style.getPropertyValue('--ui-screen-inline-padding')
    ).toBe('1rem');
  });

  it('should prefer custom right slot over overflow menu', () => {
    render(
      <AppHeader
        title="Lobby"
        menuItems={[{ id: '1', label: 'Пункт 1' }]}
        right={<span data-testid="custom-right">Gear</span>}
      />
    );

    expect(screen.getByTestId('custom-right')).toBeTruthy();
    expect(screen.queryByTestId('app-header-menu')).toBeNull();
  });

  it('should hide browser overflow menu in TMA', () => {
    hasTelegramInitData.mockReturnValue(true);

    render(<AppHeader title="Profile" menuItems={[{ id: '1', label: 'Пункт 1' }]} />);

    expect(screen.queryByTestId('app-header-menu')).toBeNull();
  });

  it('should respect showMenuInBrowser=false outside TMA', () => {
    render(
      <AppHeader
        title="Profile"
        menuItems={[{ id: '1', label: 'Пункт 1' }]}
        showMenuInBrowser={false}
      />
    );

    expect(screen.queryByTestId('app-header-menu')).toBeNull();
  });

  it('should close overflow menu on Escape and outside click', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <AppHeader
          title="Profile"
          menuItems={[
            { id: '1', label: 'Пункт 1' },
            { id: '2', label: 'Пункт 2' },
          ]}
        />
        <button type="button" data-testid="outside">
          Outside
        </button>
      </div>
    );

    await user.click(screen.getByTestId('app-header-menu'));
    expect(screen.getByTestId('app-header-menu-popover')).toBeTruthy();

    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByTestId('app-header-menu-popover')).toBeNull();

    await user.click(screen.getByTestId('app-header-menu'));
    expect(screen.getByTestId('app-header-menu-popover')).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('app-header-menu-popover')).toBeNull();
  });

  it('should anchor overflow popover under the menu button with shrink-to-fit width', async () => {
    const user = userEvent.setup();

    render(
      <AppHeader
        title="Profile"
        menuItems={[
          { id: '1', label: 'Пункт 1' },
          { id: '2', label: 'Пункт 2' },
        ]}
      />
    );

    const menuBtn = screen.getByTestId('app-header-menu');
    Object.defineProperty(menuBtn, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          top: 12,
          left: 320,
          right: 360,
          bottom: 52,
          width: 40,
          height: 40,
          x: 320,
          y: 12,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    await user.click(menuBtn);

    const popover = screen.getByTestId('app-header-menu-popover');
    expect(popover.style.position).toBe('fixed');
    expect(popover.style.top).toBe('56px');
    expect(popover.style.right).toBe(`${window.innerWidth - 360}px`);
    expect(popover.className).toContain('w-max');
    expect(popover.className).toContain('pointer-events-auto');
  });

  it('should toggle overflow menu closed on repeated menu button click', async () => {
    const user = userEvent.setup();

    render(<AppHeader title="Profile" menuItems={[{ id: '1', label: 'Пункт 1' }]} />);

    const menuBtn = screen.getByTestId('app-header-menu');
    await user.click(menuBtn);
    expect(screen.getByTestId('app-header-menu-popover')).toBeTruthy();

    await user.click(menuBtn);
    expect(screen.queryByTestId('app-header-menu-popover')).toBeNull();
  });
});
