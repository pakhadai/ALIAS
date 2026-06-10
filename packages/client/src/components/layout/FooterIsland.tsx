import { useEffect, type CSSProperties, type ReactNode } from 'react';

export const FOOTER_ISLAND_CLASS = 'footer-island';
export const FOOTER_ISLAND_DOCUMENT_FLAG = 'footerIsland';

export interface FooterIslandProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Accessible label when the island acts as navigation chrome. */
  ariaLabel?: string;
}

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Fixed floating glass capsule — backdrop blur on viewport-fixed layer (not inside scroll). */
export function FooterIsland({ children, className = '', style, ariaLabel }: FooterIslandProps) {
  useEffect(() => {
    document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG] = 'true';
    return () => {
      delete document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG];
    };
  }, []);

  return (
    <footer
      className={joinClasses(
        FOOTER_ISLAND_CLASS,
        'pointer-events-auto flex items-center px-3',
        className
      )}
      style={style}
      aria-label={ariaLabel}
    >
      {children}
    </footer>
  );
}
