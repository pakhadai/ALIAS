import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

/** Selector for bottom sheet backdrops that use {@link keyboardAvoidingBottomPadding}. */
export const BOTTOM_SHEET_BACKDROP_SELECTOR = '[data-bottom-sheet-backdrop]';

type VisualViewportLike = Pick<VisualViewport, 'height' | 'offsetTop'>;

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
 * Pixels of the layout viewport obscured from below (virtual keyboard, browser UI)
 * using the Visual Viewport API. Returns 0 when unsupported or no overlap.
 */
export function useVisualViewportBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const layoutHeight = window.innerHeight;
        setInset(computeVisualViewportBottomInset(vv, layoutHeight));
      });
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return inset;
}

/** Extra bottom padding so edge-to-edge bottom sheets sit above the virtual keyboard. */
export function keyboardAvoidingBottomPadding(insetPx: number): CSSProperties | undefined {
  if (insetPx <= 0) return undefined;
  return {
    paddingBottom: `${insetPx}px`,
  };
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
