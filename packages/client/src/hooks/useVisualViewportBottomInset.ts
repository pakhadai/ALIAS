import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

/** Selector for bottom sheet backdrops that use {@link keyboardAvoidingBottomPadding}. */
export const BOTTOM_SHEET_BACKDROP_SELECTOR = '[data-bottom-sheet-backdrop]';

/** CSS custom property written by {@link keyboardAvoidingBottomPadding} — animated in `styles.css`. */
export const KEYBOARD_LIFT_CSS_VAR = '--sheet-keyboard-lift';

/**
 * iOS often leaves a 1–8px seam between the visual viewport bottom and the keyboard.
 * Overlap the sheet slightly so the panel background meets the keyboard as one surface.
 */
export const KEYBOARD_SHEET_OVERLAP_PX = 8;

/** Matches `--ui-keyboard-anim-ms` — iOS keyboard slide duration. */
export const KEYBOARD_ANIM_MS = 280;

/** Single follow-up after focusout when visualViewport lags keyboard dismiss on iOS. */
export const KEYBOARD_SETTLE_MS = 320;

type VisualViewportLike = Pick<VisualViewport, 'height' | 'offsetTop'>;

function readLayoutViewportHeight(): number {
  return Math.max(window.innerHeight, document.documentElement.clientHeight);
}

/**
 * Pixels of the layout viewport obscured from below (virtual keyboard, browser UI).
 * Pure helper — testable without a browser Visual Viewport mock.
 */
export function computeVisualViewportBottomInset(
  vv: VisualViewportLike,
  layoutHeight: number
): number {
  return Math.max(0, Math.round(layoutHeight - vv.offsetTop - vv.height));
}

/**
 * Lift px for backdrop / full-page wrapper — keyboard height + overlap buffer, or 0 when closed.
 */
export function computeKeyboardLiftPx(insetPx: number): number {
  if (insetPx <= 0) return 0;
  return insetPx + KEYBOARD_SHEET_OVERLAP_PX;
}

/**
 * Pixels of the layout viewport obscured from below (virtual keyboard, browser UI)
 * using the Visual Viewport API. Returns 0 when unsupported or no overlap.
 */
export function useVisualViewportBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    let settleTimer = 0;

    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const layoutHeight = readLayoutViewportHeight();
        setInset(computeVisualViewportBottomInset(vv, layoutHeight));
      });
    };

    /** iOS keyboard dismiss can lag visualViewport; one re-measure after settle window. */
    const schedulePostKeyboardUpdate = () => {
      update();
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(update, KEYBOARD_SETTLE_MS);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    if ('addEventListener' in vv && 'geometrychange' in vv) {
      vv.addEventListener('geometrychange', update);
    }
    window.addEventListener('resize', update);
    document.addEventListener('focusout', schedulePostKeyboardUpdate, true);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settleTimer);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      if ('removeEventListener' in vv && 'geometrychange' in vv) {
        vv.removeEventListener('geometrychange', update);
      }
      window.removeEventListener('resize', update);
      document.removeEventListener('focusout', schedulePostKeyboardUpdate, true);
    };
  }, []);

  return inset;
}

/**
 * Sets `--sheet-keyboard-lift` for CSS-animated padding on `.bottom-sheet-backdrop`
 * and `.keyboard-avoiding-lift` wrappers.
 */
export function keyboardAvoidingBottomPadding(insetPx: number): CSSProperties {
  const liftPx = computeKeyboardLiftPx(insetPx);
  return {
    [KEYBOARD_LIFT_CSS_VAR]: `${liftPx}px`,
  } as CSSProperties;
}

function isInsideBottomSheetBackdrop(el: HTMLElement): boolean {
  return el.closest(BOTTOM_SHEET_BACKDROP_SELECTOR) != null;
}

/**
 * Scroll focused inputs into the visible viewport.
 * Skips bottom sheets — {@link keyboardAvoidingBottomPadding} already lifts the panel; scrolling
 * the backdrop with `block: "center"` pushes the sheet too far above the keyboard.
 */
export function scrollElementIntoViewCentered(el: HTMLElement) {
  if (isInsideBottomSheetBackdrop(el)) return;

  requestAnimationFrame(() => {
    if (typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' });
  });
}
