import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScreenShell } from './ScreenShell';

describe('ScreenShell', () => {
  it('should constrain shell height and make the content column scrollable', () => {
    const { container } = render(
      <ScreenShell footer={<div data-testid="footer">Footer</div>}>
        <div data-testid="content">Scrollable body</div>
      </ScreenShell>
    );

    const shell = container.firstElementChild;
    expect(shell?.className).toContain('h-[var(--tg-viewport-height,100dvh)]');
    expect(shell?.className).toContain('max-h-[var(--tg-viewport-height,100dvh)]');

    const scrollColumn = screen.getByTestId('content').parentElement;
    expect(scrollColumn?.className).toContain('overflow-y-auto');
    expect(scrollColumn?.className).toContain('min-h-0');
    expect(scrollColumn?.className).toContain('flex-1');
  });
});
