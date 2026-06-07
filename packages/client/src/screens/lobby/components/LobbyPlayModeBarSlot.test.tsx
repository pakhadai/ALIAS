import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LobbyPlayModeBarSlot } from './LobbyPlayModeBarSlot';

describe('LobbyPlayModeBarSlot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(performance.now()), 16)
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      window.clearTimeout(id);
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 180;
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should mount and settle to idle when open becomes true', async () => {
    const { rerender } = render(
      <LobbyPlayModeBarSlot open={false}>
        <div data-testid="child">Format</div>
      </LobbyPlayModeBarSlot>
    );

    expect(screen.queryByTestId('lobby-play-mode-bar-slot')).toBeNull();

    rerender(
      <LobbyPlayModeBarSlot open>
        <div data-testid="child">Format</div>
      </LobbyPlayModeBarSlot>
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('lobby-play-mode-bar-slot')).toHaveAttribute('data-motion', 'idle');
  });

  it('should collapse and unmount when open becomes false', async () => {
    const { rerender } = render(
      <LobbyPlayModeBarSlot open>
        <div data-testid="child">Format</div>
      </LobbyPlayModeBarSlot>
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    rerender(
      <LobbyPlayModeBarSlot open={false}>
        <div data-testid="child">Format</div>
      </LobbyPlayModeBarSlot>
    );

    expect(screen.getByTestId('lobby-play-mode-bar-slot')).toHaveAttribute('data-motion', 'exit');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByTestId('lobby-play-mode-bar-slot')).toBeNull();
  });
});
