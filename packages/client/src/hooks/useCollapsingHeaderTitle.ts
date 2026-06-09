import { useEffect, useState, type RefObject } from 'react';
import { CSS_VAR_APP_PAGE_HEADER_HEIGHT } from '../constants/tmaLayoutConstants';

export const SCREEN_SHELL_SCROLL_ATTR = 'data-screen-shell-scroll';

const HEADER_HEIGHT_FALLBACK_PX = 88;

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    if (node.hasAttribute(SCREEN_SHELL_SCROLL_ATTR)) return node;
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

function readHeaderHeightPx(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(CSS_VAR_APP_PAGE_HEADER_HEIGHT)
    .trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : HEADER_HEIGHT_FALLBACK_PX;
}

/** True when the hero title has scrolled under the sticky app header. */
export function useCollapsingHeaderTitle(
  targetRef: RefObject<HTMLElement | null>,
  enabled = true
): boolean {
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setShowHeaderTitle(false);
      return;
    }

    const el = targetRef.current;
    if (!el) return;

    const scrollRoot = findScrollParent(el);
    if (!scrollRoot) return;

    const check = () => {
      const headerPx = readHeaderHeightPx();
      const rootRect = scrollRoot.getBoundingClientRect();
      const titleRect = el.getBoundingClientRect();
      const headerBottom = rootRect.top + headerPx;
      setShowHeaderTitle(titleRect.bottom <= headerBottom);
    };

    check();
    scrollRoot.addEventListener('scroll', check, { passive: true });

    const ro = new ResizeObserver(check);
    ro.observe(el);

    const headerEl = scrollRoot.querySelector('header.ui-app-header');
    if (headerEl) ro.observe(headerEl);

    return () => {
      scrollRoot.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, [targetRef, enabled]);

  return showHeaderTitle;
}
