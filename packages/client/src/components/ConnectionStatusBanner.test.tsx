import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';

vi.mock('../context/GameContext', () => ({
  useGame: () => ({ isReconnecting: true }),
}));

vi.mock('../hooks/useT', () => ({
  useT: () => ({ restoringConnection: 'Restoring connection...' }),
}));

describe('ConnectionStatusBanner', () => {
  beforeAll(() => {
    const style = document.createElement('style');
    style.setAttribute('data-testid', 'status-banner-fixture');
    style.textContent = `
      :root {
        --z-status-banner: 25;
        --z-liquid-chrome: 30;
        --app-page-header-height: 148px;
        --tma-banner-top: var(--app-page-header-height);
      }
      .ui-status-banner {
        z-index: var(--z-status-banner);
      }
    `;
    document.head.appendChild(style);
  });

  afterEach(() => {
    cleanup();
  });

  it('should position below header chrome via --tma-banner-top', () => {
    render(<ConnectionStatusBanner />);

    const banner = screen.getByRole('status');
    expect(banner.className).toContain('--tma-banner-top');
    expect(banner.className).not.toContain('--z-banner');
  });

  it('should use ui-status-banner stacking (not bottom PWA banner z token)', () => {
    render(<ConnectionStatusBanner />);

    const banner = screen.getByRole('status');
    expect(banner.className).toContain('ui-status-banner');
    expect(banner.className).not.toContain('--z-banner');
  });
});
