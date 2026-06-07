import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import {
  useSheetDragToClose,
  SHEET_DRAG_DISMISS_THRESHOLD_PX,
  SHEET_DRAG_DISMISS_MS,
} from './useSheetDragToClose';

function setupPanel(scrollTop = 0) {
  const panel = document.createElement('div');
  panel.style.height = '400px';
  Object.defineProperty(panel, 'scrollTop', { value: scrollTop, writable: true });
  Object.defineProperty(panel, 'offsetHeight', { value: 400 });
  const handle = document.createElement('div');
  handle.setAttribute('data-sheet-drag-handle', '');
  panel.appendChild(handle);
  document.body.appendChild(panel);
  return panel;
}

describe('useSheetDragToClose', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should call onDismiss when drag exceeds threshold', () => {
    const panel = setupPanel();
    const onDismiss = vi.fn();

    const { result } = renderHook(() => {
      const panelRef = useRef<HTMLElement | null>(panel);
      return useSheetDragToClose({ enabled: true, onDismiss, panelRef });
    });

    const target = panel;
    act(() => {
      result.current.dragHandlers.onPointerDown({
        button: 0,
        clientY: 100,
        pointerId: 1,
        target: panel.querySelector('[data-sheet-drag-handle]')!,
        currentTarget: target,
        setPointerCapture: vi.fn(),
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    act(() => {
      result.current.dragHandlers.onPointerMove({
        clientY: 100 + SHEET_DRAG_DISMISS_THRESHOLD_PX + 10,
        pointerId: 1,
        currentTarget: target,
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    act(() => {
      result.current.dragHandlers.onPointerUp({
        pointerId: 1,
        currentTarget: target,
        releasePointerCapture: vi.fn(),
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    act(() => {
      vi.advanceTimersByTime(SHEET_DRAG_DISMISS_MS);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should snap back when drag is below threshold', () => {
    const panel = setupPanel();
    const onDismiss = vi.fn();

    const { result } = renderHook(() => {
      const panelRef = useRef<HTMLElement | null>(panel);
      return useSheetDragToClose({ enabled: true, onDismiss, panelRef });
    });

    const target = panel;
    act(() => {
      result.current.dragHandlers.onPointerDown({
        button: 0,
        clientY: 50,
        pointerId: 2,
        target: panel.querySelector('[data-sheet-drag-handle]')!,
        currentTarget: target,
        setPointerCapture: vi.fn(),
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    act(() => {
      result.current.dragHandlers.onPointerMove({
        clientY: 90,
        pointerId: 2,
        currentTarget: target,
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    act(() => {
      result.current.dragHandlers.onPointerUp({
        pointerId: 2,
        currentTarget: target,
        releasePointerCapture: vi.fn(),
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(result.current.offsetY).toBe(0);
  });

  it('should not start drag when pointer down is on a button (CTA must click)', () => {
    const panel = setupPanel();
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Next';
    panel.appendChild(button);
    const onDismiss = vi.fn();

    const { result } = renderHook(() => {
      const panelRef = useRef<HTMLElement | null>(panel);
      return useSheetDragToClose({ enabled: true, onDismiss, panelRef });
    });

    act(() => {
      result.current.dragHandlers.onPointerDown({
        button: 0,
        clientY: 200,
        pointerId: 3,
        target: button,
        currentTarget: panel,
        setPointerCapture: vi.fn(),
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    expect(result.current.isDragging).toBe(false);
  });
});
