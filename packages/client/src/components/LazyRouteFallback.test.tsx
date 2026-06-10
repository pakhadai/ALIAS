import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScreenShell } from './layout/ScreenShell';
import { typographyClass } from '../constants/typography';

/** Mirror App.tsx LazyRouteFallback — keep padding contract in sync. */
function LazyRouteFallback() {
  return (
    <ScreenShell contentClassName="flex flex-1 items-center justify-center px-6">
      <p className={`${typographyClass.body} text-ui-fg-muted`}>Завантаження…</p>
    </ScreenShell>
  );
}

describe('LazyRouteFallback', () => {
  it('should use ScreenShell viewport height and safe-area padding like routed screens', () => {
    const { container } = render(<LazyRouteFallback />);

    const shell = container.firstElementChild;
    expect(shell?.className).toContain('h-[var(--tg-viewport-height,100dvh)]');
    expect(shell?.className).toContain('max-h-[var(--tg-viewport-height,100dvh)]');

    const scrollColumn = screen.getByText('Завантаження…').parentElement?.parentElement;
    expect(scrollColumn?.className).toContain('pt-safe-top');
    expect(scrollColumn?.className).toContain('pb-safe-bottom');
  });
});
