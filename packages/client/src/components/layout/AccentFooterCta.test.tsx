import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccentFooterCta } from './AccentFooterCta';

describe('AccentFooterCta', () => {
  it('should use plain shell and button classes without ready or blocked modifiers', () => {
    render(
      <AccentFooterCta variant="plain" themeButtonClass="btn-theme" onClick={vi.fn()}>
        Log out
      </AccentFooterCta>
    );

    const shell = screen.getByTestId('accent-footer-cta-shell');
    expect(shell).toHaveClass('accent-footer-cta-shell--plain');
    expect(shell).not.toHaveClass('accent-footer-cta-shell--ready');
    expect(shell).not.toHaveClass('accent-footer-cta-shell--blocked');

    const btn = screen.getByTestId('accent-footer-cta');
    expect(btn).toHaveClass('lobby-start-btn--plain');
    expect(btn).toHaveClass('btn-theme');
    expect(btn).not.toHaveClass('lobby-start-btn--ready');
    expect(btn).not.toHaveClass('lobby-start-btn--blocked');
  });

  it('should use animated ready shell when variant is animated', () => {
    render(
      <AccentFooterCta variant="animated" themeButtonClass="btn-theme" onClick={vi.fn()}>
        Start
      </AccentFooterCta>
    );

    expect(screen.getByTestId('accent-footer-cta-shell')).toHaveClass(
      'accent-footer-cta-shell--ready'
    );
    expect(screen.getByTestId('accent-footer-cta')).toHaveClass('lobby-start-btn--ready');
  });

  it('should use blocked shell when variant is blocked', () => {
    render(
      <AccentFooterCta variant="blocked" themeButtonClass="btn-theme" onClick={vi.fn()}>
        Start
      </AccentFooterCta>
    );

    expect(screen.getByTestId('accent-footer-cta-shell')).toHaveClass(
      'accent-footer-cta-shell--blocked'
    );
    expect(screen.getByTestId('accent-footer-cta')).toHaveClass('lobby-start-btn--blocked');
    expect(screen.getByTestId('accent-footer-cta')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('accent-footer-cta')).not.toBeDisabled();
  });

  it('should resolve blocked from deprecated ready=false shim when variant is omitted', () => {
    render(
      <AccentFooterCta ready={false} themeButtonClass="btn-theme" onClick={vi.fn()}>
        Start
      </AccentFooterCta>
    );

    expect(screen.getByTestId('accent-footer-cta-shell')).toHaveClass(
      'accent-footer-cta-shell--blocked'
    );
  });

  it('should prefer explicit variant over deprecated ready/blocked props', () => {
    render(
      <AccentFooterCta
        variant="plain"
        ready={false}
        blocked
        themeButtonClass="btn-theme"
        onClick={vi.fn()}
      >
        Reset
      </AccentFooterCta>
    );

    expect(screen.getByTestId('accent-footer-cta-shell')).toHaveClass(
      'accent-footer-cta-shell--plain'
    );
  });
});
