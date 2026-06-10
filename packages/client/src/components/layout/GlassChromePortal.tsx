import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface GlassChromePortalProps {
  children: ReactNode;
}

/** Prepended to `document.body` so scrollIntoView on fixed chrome does not scroll the page to the portal anchor at body end. */
export const GLASS_CHROME_PORTAL_ROOT_ID = 'glass-chrome-portal-root';

function getGlassChromePortalRoot(): HTMLElement {
  let root = document.getElementById(GLASS_CHROME_PORTAL_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = GLASS_CHROME_PORTAL_ROOT_ID;
    root.setAttribute('data-glass-chrome-portal', '');
    document.body.prepend(root);
  }
  return root;
}

/**
 * Renders fixed liquid glass header/footer into a prepended body root so `position: fixed` and
 * `backdrop-filter` use the viewport — not a transformed ancestor (e.g. `PageTransition`).
 * Pattern mirrors {@link ModalPortal} in `Shared.tsx`.
 */
export function GlassChromePortal({ children }: GlassChromePortalProps) {
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, getGlassChromePortalRoot());
}
