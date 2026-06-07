import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBottomSheetPresence, BOTTOM_SHEET_ANIM_MS } from './useBottomSheetPresence';

describe('useBottomSheetPresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(performance.now()), 16)
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      window.clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should mount with visible=false when open is true on first render', async () => {
    const { result, unmount } = renderHook(() => useBottomSheetPresence(true));

    expect(result.current.mounted).toBe(true);
    expect(result.current.visible).toBe(false);

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    unmount();
  });

  it('should set mounted true when open flips from false to true', async () => {
    const { result, rerender } = renderHook(({ open }) => useBottomSheetPresence(open), {
      initialProps: { open: false },
    });

    expect(result.current.mounted).toBe(false);

    rerender({ open: true });

    expect(result.current.mounted).toBe(true);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.visible).toBe(true);
  });

  it('should not clear mounted after open when initial close timer was scheduled', async () => {
    const { result, rerender } = renderHook(({ open }) => useBottomSheetPresence(open), {
      initialProps: { open: false },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });

    rerender({ open: true });
    expect(result.current.mounted).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(BOTTOM_SHEET_ANIM_MS + 50);
    });

    expect(result.current.mounted).toBe(true);
  });

  it('should ignore stale exit timer that fires after open becomes true', async () => {
    const { result, rerender } = renderHook(({ open }) => useBottomSheetPresence(open), {
      initialProps: { open: false },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });

    rerender({ open: true });
    expect(result.current.mounted).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(BOTTOM_SHEET_ANIM_MS);
    });

    expect(result.current.mounted).toBe(true);
    expect(result.current.visible).toBe(true);
  });
});
