import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import {
  useSheetDragToClose,
  SHEET_DRAG_DISMISS_THRESHOLD_PX,
  SHEET_DRAG_DISMISS_MS,
  SHEET_DRAG_PULL_UP_MAX_PX,
} from './useSheetDragToClose';

function setupPanel(scrollTop = 0) {
  const panel = document.createElement('div');
  panel.style.height = '400px';
  Object.defineProperty(panel, 'scrollTop', { value: scrollTop, writable: true });
  Object.defineProperty(panel, 'offsetHeight', { value: 400 });
  const dragZone = document.createElement('div');
  dragZone.setAttribute('data-sheet-drag-handle', '');
  const handle = document.createElement('div');
  dragZone.appendChild(handle);
  panel.appendChild(dragZone);
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

  it('should clamp upward pull with bottom-anchored rubber band (no negative translateY)', () => {
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
        clientY: 200,
        pointerId: 4,
        target: panel.querySelector('[data-sheet-drag-handle]')!,
        currentTarget: target,
        setPointerCapture: vi.fn(),
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    act(() => {
      result.current.dragHandlers.onPointerMove({
        clientY: 50,
        pointerId: 4,
        currentTarget: target,
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    expect(result.current.offsetY).toBeGreaterThanOrEqual(-SHEET_DRAG_PULL_UP_MAX_PX);
    expect(result.current.panelStyle?.transform).toContain('translate3d(0, 0px, 0)');
    expect(result.current.panelStyle?.transform).toContain('scaleY(');
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

  it('should not start drag when pointer down is on sheet body (only top bar)', () => {
    const panel = setupPanel();
    const body = document.createElement('p');
    body.textContent = 'Language';
    panel.appendChild(body);
    const onDismiss = vi.fn();

    const { result } = renderHook(() => {
      const panelRef = useRef<HTMLElement | null>(panel);
      return useSheetDragToClose({ enabled: true, onDismiss, panelRef });
    });

    act(() => {
      result.current.dragHandlers.onPointerDown({
        button: 0,
        clientY: 200,
        pointerId: 5,
        target: body,
        currentTarget: panel,
        setPointerCapture: vi.fn(),
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    expect(result.current.isDragging).toBe(false);
  });

  it('should not start drag when pointer down is on close button inside drag zone', () => {
    const panel = setupPanel();
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'Close';
    panel.querySelector('[data-sheet-drag-handle]')!.appendChild(closeButton);
    const onDismiss = vi.fn();

    const { result } = renderHook(() => {
      const panelRef = useRef<HTMLElement | null>(panel);
      return useSheetDragToClose({ enabled: true, onDismiss, panelRef });
    });

    act(() => {
      result.current.dragHandlers.onPointerDown({
        button: 0,
        clientY: 40,
        pointerId: 6,
        target: closeButton,
        currentTarget: panel,
        setPointerCapture: vi.fn(),
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    expect(result.current.isDragging).toBe(false);
  });
});
