import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

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
        const h = window.innerHeight;
        const covered = Math.max(0, h - vv.offsetTop - vv.height);
        setInset(Math.round(covered));
      });
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}

/** Extra bottom padding so fixed bottom sheets / full pages sit above the keyboard + safe area. */
export function keyboardAvoidingBottomPadding(insetPx: number): CSSProperties | undefined {
  if (insetPx <= 0) return undefined;
  return {
    paddingBottom: `calc(${insetPx}px + max(1.5rem, env(safe-area-inset-bottom, 0px)))`,
  };
}

/** Scroll focused inputs into the visible viewport (pairs well with {@link useVisualViewportBottomInset}). */
export function scrollElementIntoViewCentered(el: HTMLElement) {
  requestAnimationFrame(() => {
    if (typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth', inline: 'nearest' });
  });
}
