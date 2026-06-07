import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

export const SHEET_DRAG_DISMISS_THRESHOLD_PX = 96;
export const SHEET_DRAG_DISMISS_MS = 240;
export const SHEET_DRAG_SNAP_MS = 380;

const NO_DRAG_HANDLERS = {
  onPointerDown: () => undefined,
  onPointerMove: () => undefined,
  onPointerUp: () => undefined,
  onPointerCancel: () => undefined,
} as const;

function isSheetScrollAtTop(panel: HTMLElement): boolean {
  if (panel.scrollTop > 0) return false;
  const scrollBody = panel.querySelector('[data-sheet-scroll]');
  if (scrollBody instanceof HTMLElement && scrollBody.scrollTop > 0) return false;
  return true;
}

/** Buttons/inputs must receive clicks — do not capture pointer for sheet drag. */
function isInteractiveSheetTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, input, textarea, select, a, label, [role="button"], [contenteditable="true"]'
    )
  );
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

  const canStartDrag = useCallback(
    (target: EventTarget | null) => {
      if (!enabled || !panelRef.current) return false;
      const panel = panelRef.current;
      const handle = panel.querySelector('[data-sheet-drag-handle]');
      if (handle?.contains(target as Node)) return true;
      if (isInteractiveSheetTarget(target)) return false;
      return isSheetScrollAtTop(panel);
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
    setOffsetY(delta < 0 ? delta * 0.15 : delta);
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
        const panelH = panelRef.current?.offsetHeight ?? 480;
        setOffsetY(panelH);
        window.setTimeout(() => {
          resetDrag();
          onDismissRef.current();
        }, SHEET_DRAG_DISMISS_MS);
        return;
      }

      setIsDragging(false);
      setIsSnapping(true);
      setOffsetY(0);
      window.setTimeout(() => setIsSnapping(false), SHEET_DRAG_SNAP_MS);
    },
    [panelRef, resetDrag]
  );

  const panelStyle = useMemo((): React.CSSProperties | undefined => {
    const hasDragTransform = isDragging || isSnapping || isDismissing || offsetY !== 0;
    if (!hasDragTransform) return undefined;
    return {
      transform: `translateY(${Math.max(0, offsetY)}px)`,
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
