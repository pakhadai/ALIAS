import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GLASS_CHROME_PORTAL_ROOT_ID, GlassChromePortal } from './GlassChromePortal';

describe('GlassChromePortal', () => {
  afterEach(() => {
    document.getElementById(GLASS_CHROME_PORTAL_ROOT_ID)?.remove();
  });

  it('should render children into a prepended portal root on document.body', () => {
    render(
      <GlassChromePortal>
        <div data-testid="chrome">Header</div>
      </GlassChromePortal>
    );

    const chrome = screen.getByTestId('chrome');
    const root = document.getElementById(GLASS_CHROME_PORTAL_ROOT_ID);
    expect(root).toBeTruthy();
    expect(root?.parentElement).toBe(document.body);
    expect(document.body.firstElementChild).toBe(root);
    expect(chrome.parentElement).toBe(root);
  });

  it('should unmount portaled chrome from the portal root', () => {
    const { unmount } = render(
      <GlassChromePortal>
        <div data-testid="chrome">Footer</div>
      </GlassChromePortal>
    );

    expect(screen.getByTestId('chrome')).toBeTruthy();
    unmount();
    expect(document.body.querySelector('[data-testid="chrome"]')).toBeNull();
  });
});
