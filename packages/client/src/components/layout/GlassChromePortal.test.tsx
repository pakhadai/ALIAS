import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassChromePortal } from './GlassChromePortal';

describe('GlassChromePortal', () => {
  it('should render children into document.body for viewport-fixed backdrop-filter', () => {
    render(
      <GlassChromePortal>
        <div data-testid="chrome">Header</div>
      </GlassChromePortal>
    );

    const chrome = screen.getByTestId('chrome');
    expect(chrome.parentElement).toBe(document.body);
  });

  it('should unmount portaled chrome from document.body', () => {
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
