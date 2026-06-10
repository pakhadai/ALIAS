import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CSS_VAR_APP_PAGE_HEADER_HEIGHT } from '../constants/tmaLayoutConstants';
import { ToastNotification } from './Shared';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';
import { APP_HEADER_DOCUMENT_FLAG, GlassAppHeader } from './layout/GlassAppHeader';

vi.mock('../context/GameContext', () => ({
  useGame: () => ({ isReconnecting: true }),
}));

vi.mock('../hooks/useT', () => ({
  useT: () => ({ restoringConnection: 'Restoring connection...' }),
}));

function readToastOffsetHeader(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--tma-toast-offset-header')
    .trim();
}

function readToastTop(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--tma-toast-top').trim();
}

function readBannerTop(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--tma-banner-top').trim();
}

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

describe('ToastNotification', () => {
  beforeAll(() => {
    const style = document.createElement('style');
    style.setAttribute('data-testid', 'toast-offset-fixture');
    style.textContent = `
      :root {
        --tma-toast-offset-header: 0px;
        --app-page-header-height: 148px;
        --tma-banner-top: var(--app-page-header-height);
        --tma-toast-top: calc(max(0.75rem, var(--tma-inset-top)) + var(--tma-toast-offset-header));
      }
      html[data-app-header] {
        --tma-toast-offset-header: var(--app-page-header-height);
        --tma-toast-top: calc(var(--app-page-header-height) + 0.75rem);
        --tma-banner-top: var(--app-page-header-height);
      }
    `;
    document.head.appendChild(style);
  });

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    delete document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG];
    document.documentElement.style.removeProperty(CSS_VAR_APP_PAGE_HEADER_HEIGHT);
    cleanup();
    vi.unstubAllGlobals();
  });

  it('should render in a portal positioned with --tma-toast-top', () => {
    render(<ToastNotification message="Hello" onClose={() => {}} />);

    const toastHost = screen.getByRole('status').closest('[class*="--tma-toast-top"]');
    expect(toastHost).toBeTruthy();
    expect(screen.getByRole('status')).toHaveTextContent('Hello');
  });

  it('should use zero header offset when no page header is present', () => {
    render(<ToastNotification message="No header" onClose={() => {}} />);
    expect(readToastOffsetHeader()).toBe('0px');
  });

  it('should offset below GlassAppHeader when the header bar is mounted', () => {
    render(
      <>
        <GlassAppHeader>
          <span>Title</span>
        </GlassAppHeader>
        <ToastNotification message="Below header" onClose={() => {}} />
      </>
    );

    expect(document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG]).toBe('true');
    expect(readToastOffsetHeader()).toBe('var(--app-page-header-height)');
    expect(readToastTop()).toBe('calc(var(--app-page-header-height) + 0.75rem)');
    expect(readBannerTop()).toBe('var(--app-page-header-height)');
  });

  it('should position ConnectionStatusBanner with --tma-banner-top', () => {
    render(<ConnectionStatusBanner />);

    const banner = screen.getByRole('status');
    expect(banner.className).toContain('--tma-banner-top');
  });
});
