import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

export const SHEET_DRAG_DISMISS_THRESHOLD_PX = 96;
export const SHEET_DRAG_DISMISS_MS = 240;
export const SHEET_DRAG_SNAP_MS = 380;
/** Max upward pull (px) before rubber-band resistance — panel stays bottom-anchored */
export const SHEET_DRAG_PULL_UP_MAX_PX = 48;
export const SHEET_DRAG_PULL_UP_DAMPING = 0.22;
export const SHEET_DRAG_PULL_UP_SCALE_MAX = 0.035;

const NO_DRAG_HANDLERS = {
  onPointerDown: () => undefined,
  onPointerMove: () => undefined,
  onPointerUp: () => undefined,
  onPointerCancel: () => undefined,
} as const;

/** Buttons/inputs must receive clicks — do not capture pointer for sheet drag. */
function isInteractiveSheetTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, input, textarea, select, a, label, [role="button"], [contenteditable="true"]'
    )
  );
}

function resolveSheetScrollElement(panel: HTMLElement): HTMLElement {
  return panel.querySelector<HTMLElement>('[data-modal-sheet-scroll]') ?? panel;
}

function isSheetDragHandleTarget(panel: HTMLElement, target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  const dragZone = panel.querySelector('[data-sheet-drag-handle]');
  return Boolean(dragZone?.contains(target));
}

type UseSheetDragToCloseOptions = {
  enabled: boolean;
  onDismiss: () => void;
  panelRef: RefObject<HTMLElement | null>;
};

export type SheetDragState = {
  offsetY: number;
  isDragging: boolean;
  isSnapping: boolean;
  isDismissing: boolean;
  panelStyle: React.CSSProperties | undefined;
  dragHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  };
};

export function useSheetDragToClose({
  enabled,
  onDismiss,
  panelRef,
}: UseSheetDragToCloseOptions): SheetDragState {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const activeRef = useRef(false);
  const offsetYRef = useRef(0);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  offsetYRef.current = offsetY;

  const resetDrag = useCallback(() => {
    setIsDragging(false);
    setIsSnapping(false);
    setIsDismissing(false);
    setOffsetY(0);
    pointerIdRef.current = null;
    activeRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) resetDrag();
  }, [enabled, resetDrag]);

  useEffect(() => {
    const panel = panelRef.current;
    return () => {
      const pointerId = pointerIdRef.current;
      if (pointerId == null || !panel) return;
      try {
        panel.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      resetDrag();
    };
  }, [panelRef, resetDrag]);

  /**
   * Block rubber-band pull on scroll body when already at top — swipe-to-dismiss stays on the header
   * handle only (iOS WebView otherwise scrolls/bounces inner content).
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!enabled || !panel) return;

    const scrollEl = resolveSheetScrollElement(panel);
    let touchStartY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (isInteractiveSheetTarget(e.target)) return;
      if (isSheetDragHandleTarget(panel, e.target)) return;
      touchStartY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (activeRef.current) return;
      if (e.touches.length !== 1) return;
      if (isInteractiveSheetTarget(e.target)) return;
      if (isSheetDragHandleTarget(panel, e.target)) return;
      if (scrollEl.scrollTop > 0) return;
      const deltaY = (e.touches[0]?.clientY ?? 0) - touchStartY;
      if (deltaY > 0) e.preventDefault();
    };

    scrollEl.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollEl.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      scrollEl.removeEventListener('touchstart', onTouchStart);
      scrollEl.removeEventListener('touchmove', onTouchMove);
    };
  }, [enabled, panelRef]);

  const canStartDrag = useCallback(
    (target: EventTarget | null) => {
      if (!enabled || !panelRef.current) return false;
      if (isInteractiveSheetTarget(target)) return false;
      return isSheetDragHandleTarget(panelRef.current, target);
    },
    [enabled, panelRef]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!canStartDrag(e.target) || e.button !== 0) return;
      pointerIdRef.current = e.pointerId;
      startYRef.current = e.clientY;
      activeRef.current = true;
      setIsDragging(true);
      setIsSnapping(false);
      setIsDismissing(false);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [canStartDrag]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
    const delta = e.clientY - startYRef.current;
    if (delta < 0) {
      const damped = delta * SHEET_DRAG_PULL_UP_DAMPING;
      setOffsetY(Math.max(-SHEET_DRAG_PULL_UP_MAX_PX, damped));
      return;
    }
    setOffsetY(delta);
  }, []);

  const finishDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
      activeRef.current = false;
      pointerIdRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const currentOffset = offsetYRef.current;
      if (currentOffset >= SHEET_DRAG_DISMISS_THRESHOLD_PX) {
        setIsDragging(false);
        setIsDismissing(true);
        const dismissDistance =
          typeof window !== 'undefined'
            ? window.innerHeight
            : (panelRef.current?.offsetHeight ?? 480);
        setOffsetY(dismissDistance);
        window.setTimeout(() => {
          onDismissRef.current();
        }, SHEET_DRAG_DISMISS_MS);
        return;
      }

      setIsDragging(false);
      setIsSnapping(true);
      setOffsetY(0);
      window.setTimeout(() => setIsSnapping(false), SHEET_DRAG_SNAP_MS);
    },
    [panelRef]
  );

  const panelStyle = useMemo((): React.CSSProperties | undefined => {
    const hasDragTransform = isDragging || isSnapping || isDismissing || offsetY !== 0;
    if (!hasDragTransform) return undefined;

    const pullUpPx = Math.min(0, offsetY);
    const pullUpScale =
      pullUpPx < 0
        ? 1 +
          Math.min(
            SHEET_DRAG_PULL_UP_SCALE_MAX,
            (-pullUpPx / SHEET_DRAG_PULL_UP_MAX_PX) * SHEET_DRAG_PULL_UP_SCALE_MAX
          )
        : 1;
    const translateY = Math.max(0, offsetY);

    return {
      transformOrigin: 'bottom center',
      transform: `translate3d(0, ${translateY}px, 0) scaleY(${pullUpScale})`,
      transition: isDragging
        ? 'none'
        : isDismissing
          ? `transform ${SHEET_DRAG_DISMISS_MS}ms ease-in`
          : isSnapping
            ? `transform ${SHEET_DRAG_SNAP_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`
            : undefined,
    };
  }, [isDragging, isSnapping, isDismissing, offsetY]);

  const dragHandlers = enabled
    ? { onPointerDown, onPointerMove, onPointerUp: finishDrag, onPointerCancel: finishDrag }
    : NO_DRAG_HANDLERS;

  return {
    offsetY,
    isDragging,
    isSnapping,
    isDismissing,
    panelStyle,
    dragHandlers,
  };
}
