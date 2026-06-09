import { useEffect, useRef, useState, type RefObject } from 'react';

/** Panel slide + backdrop fade duration (ms) */
export const BOTTOM_SHEET_ANIM_MS = 400;

/**
 * Focus a sheet input after enter animation — avoids keyboard lift fighting slide-up.
 * Use instead of `autoFocus` on inputs inside {@link ModalSheet}.
 */
export function useDeferredSheetInputFocus(
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  open: boolean,
  enabled = true
) {
  useEffect(() => {
    if (!open || !enabled) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, BOTTOM_SHEET_ANIM_MS);
    return () => clearTimeout(timer);
  }, [open, enabled, inputRef]);
}

type Options = {
  onExited?: () => void;
  /** Exit animation duration before unmount (default {@link BOTTOM_SHEET_ANIM_MS}). */
  animMs?: number;
};

/**
 * Keeps the sheet mounted while exit animation runs.
 * `visible` drives CSS open state; `mounted` gates render.
 */
export function useBottomSheetPresence(open: boolean, options: Options = {}) {
  const animMs = options.animMs ?? BOTTOM_SHEET_ANIM_MS;
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const onExitedRef = useRef(options.onExited);
  onExitedRef.current = options.onExited;
  const exitedFiredRef = useRef(false);
  /** Latest `open` for exit timers — avoids stale unmount after reopen (MenuScreen quick join). */
  const openRef = useRef(open);
  openRef.current = open;

  // Sync mount + closed frame when `open` flips true — must happen before paint, not in useEffect.
  // Without this, sheets that stay mounted (RulesModal) skip enter animation because
  // setMounted(true) in useEffect races with double-rAF setVisible(true).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      exitedFiredRef.current = false;
      setMounted(true);
      setVisible(false);
    }
    // Closing: keep `visible` true until rAF in effect — lets CSS transition run one painted open frame.
  }

  useEffect(() => {
    if (open) {
      let enterRaf = 0;
      let enterRafInner = 0;
      enterRaf = requestAnimationFrame(() => {
        enterRafInner = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(enterRaf);
        cancelAnimationFrame(enterRafInner);
      };
    }

    let exitRaf = 0;
    let exitTimer = 0;

    exitRaf = requestAnimationFrame(() => {
      setVisible(false);
      exitTimer = window.setTimeout(() => {
        if (openRef.current) return;
        setMounted(false);
        if (!exitedFiredRef.current) {
          exitedFiredRef.current = true;
          onExitedRef.current?.();
        }
      }, animMs);
    });

    return () => {
      cancelAnimationFrame(exitRaf);
      clearTimeout(exitTimer);
    };
  }, [open, animMs]);

  return { mounted, visible };
}
