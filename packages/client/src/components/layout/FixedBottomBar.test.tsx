import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FixedBottomBar, UI_APP_FOOTER_CLASS } from './FixedBottomBar';

describe('FixedBottomBar', () => {
  it('should apply glass footer class when glass is enabled', () => {
    const { container } = render(
      <FixedBottomBar glass>
        <button type="button">Start</button>
      </FixedBottomBar>
    );

    const bar = container.firstElementChild;
    expect(bar?.className).toContain(UI_APP_FOOTER_CLASS);
    expect(bar?.className).not.toContain('bg-linear-to-t');
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('should keep gradient wash when glass is disabled', () => {
    const { container } = render(
      <FixedBottomBar>
        <button type="button">Continue</button>
      </FixedBottomBar>
    );

    const bar = container.firstElementChild;
    expect(bar?.className).not.toContain(UI_APP_FOOTER_CLASS);
    expect(bar?.className).toContain('bg-linear-to-t');
  });
});
