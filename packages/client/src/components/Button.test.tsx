import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

vi.mock('../hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    pattern: vi.fn(),
    impactOccurred: vi.fn(),
  }),
}));

describe('Button', () => {
  it('should apply lobby-start-btn--plain when primary volume is cta', () => {
    render(
      <Button variant="primary" volume="cta" themeClass="theme-btn">
        Confirm
      </Button>
    );

    const btn = screen.getByRole('button', { name: 'Confirm' });
    expect(btn).toHaveClass('lobby-start-btn');
    expect(btn).toHaveClass('lobby-start-btn--plain');
    expect(btn).toHaveClass('theme-btn');
    expect(btn).not.toHaveClass('lobby-start-btn--ready');
    expect(btn).not.toHaveClass('bg-ui-accent');
  });

  it('should use flat primary styles when volume is flat (default)', () => {
    render(<Button variant="primary">Flat</Button>);

    const btn = screen.getByRole('button', { name: 'Flat' });
    expect(btn).not.toHaveClass('lobby-start-btn--plain');
    expect(btn).toHaveClass('bg-ui-accent');
  });

  it('should keep neutral soft-pill classes for secondary variant', () => {
    render(
      <Button variant="secondary" size="xl">
        Join
      </Button>
    );

    const btn = screen.getByRole('button', { name: 'Join' });
    expect(btn).toHaveClass('ui-soft-btn--neutral');
    expect(btn).not.toHaveClass('lobby-start-btn--plain');
  });
});
