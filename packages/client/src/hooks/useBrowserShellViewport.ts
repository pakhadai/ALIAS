import { useEffect } from 'react';
import {
  BROWSER_SHELL_DOCUMENT_FLAG,
  CSS_VAR_BROWSER_CHROME_BOTTOM_INSET,
  CSS_VAR_BROWSER_CHROME_TOP_INSET,
  CSS_VAR_BROWSER_VISUAL_VIEWPORT_HEIGHT,
} from '../constants/tmaLayoutConstants';
import { hasTelegramInitData } from './useTelegramApp';
import { isStandaloneDisplay } from '../utils/fullscreen';
import { computeVisualViewportBottomInset } from './useVisualViewportBottomInset';

type VisualViewportLike = Pick<VisualViewport, 'height' | 'offsetTop'>;

function readLayoutViewportHeight(): number {
  return Math.max(window.innerHeight, document.documentElement.clientHeight);
}

/** Publishes visual-viewport metrics for fixed SPA shell in mobile browsers (Safari bottom toolbar). */
export function syncBrowserShellViewportCssVars(vv: VisualViewportLike): void {
  const root = document.documentElement;
  const layoutHeight = readLayoutViewportHeight();
  const bottomInset = computeVisualViewportBottomInset(vv, layoutHeight);
  const topInset = Math.max(0, Math.round(vv.offsetTop));
  const heightPx = Math.max(0, Math.round(vv.height));

  root.style.setProperty(CSS_VAR_BROWSER_VISUAL_VIEWPORT_HEIGHT, `${heightPx}px`);
  root.style.setProperty(CSS_VAR_BROWSER_CHROME_BOTTOM_INSET, `${bottomInset}px`);
  root.style.setProperty(CSS_VAR_BROWSER_CHROME_TOP_INSET, `${topInset}px`);
}

export function clearBrowserShellViewportCssVars(): void {
  const root = document.documentElement;
  root.style.removeProperty(CSS_VAR_BROWSER_VISUAL_VIEWPORT_HEIGHT);
  root.style.removeProperty(CSS_VAR_BROWSER_CHROME_BOTTOM_INSET);
  root.style.removeProperty(CSS_VAR_BROWSER_CHROME_TOP_INSET);
}

/** True in mobile/desktop browser tabs — not installed PWA and not a signed Telegram session. */
export function shouldEnableBrowserShellViewport(): boolean {
  return !hasTelegramInitData() && !isStandaloneDisplay();
}

/**
 * Sizes the fixed app shell to the visible browser viewport and offsets fixed chrome
 * above Safari / Chrome bottom toolbars. Skipped in TMA and installed PWA.
 */
export function useBrowserShellViewport(): void {
  useEffect(() => {
    if (!shouldEnableBrowserShellViewport()) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    root.dataset[BROWSER_SHELL_DOCUMENT_FLAG] = 'true';

    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        syncBrowserShellViewportCssVars(vv);
      });
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      delete root.dataset[BROWSER_SHELL_DOCUMENT_FLAG];
      clearBrowserShellViewportCssVars();
    };
  }, []);
}
