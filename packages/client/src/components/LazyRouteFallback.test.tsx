import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { EmbeddedBootLoading } from './BootLoading';

/** Mirror App.tsx LazyRouteFallback — keep padding contract in sync with {@link EmbeddedBootLoading}. */
describe('EmbeddedBootLoading (LazyRouteFallback)', () => {
  it('should use ScreenShell h-full fill and safe-area padding like routed screens', () => {
    const { container } = render(<EmbeddedBootLoading message="Завантаження…" />);

    const shell = container.firstElementChild;
    expect(shell?.className).toContain('h-full');
    expect(shell?.className).toContain('max-h-full');
    expect(shell?.className).toContain('pt-safe-top');
    expect(shell?.className).toContain('pb-safe-bottom');
  });
});
