import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface GlassChromePortalProps {
  children: ReactNode;
}

/**
 * Renders fixed liquid glass header/footer into `document.body` so `position: fixed` and
 * `backdrop-filter` use the viewport — not a transformed ancestor (e.g. `PageTransition`).
 * Pattern mirrors {@link ModalPortal} in `Shared.tsx`.
 */
export function GlassChromePortal({ children }: GlassChromePortalProps) {
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, document.body);
}
