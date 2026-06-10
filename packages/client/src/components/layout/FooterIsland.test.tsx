import React from 'react';
import { afterEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FOOTER_ISLAND_CLASS, FOOTER_ISLAND_DOCUMENT_FLAG, FooterIsland } from './FooterIsland';

describe('FooterIsland', () => {
  afterEach(() => {
    delete document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG];
  });

  it('should render a fixed glass island footer with children', () => {
    const { container } = render(
      <FooterIsland>
        <button type="button">Play</button>
      </FooterIsland>
    );

    const footer = container.querySelector('footer');
    expect(footer?.className).toContain(FOOTER_ISLAND_CLASS);
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
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
});
