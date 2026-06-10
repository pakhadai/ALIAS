import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { CSS_VAR_FOOTER_ISLAND_HEIGHT } from '../../constants/tmaLayoutConstants';

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

/** Fixed full-width glass footer — header feather mirrored; anchored to viewport bottom. */
export function FooterIsland({ children, className = '', style, ariaLabel }: FooterIslandProps) {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG] = 'true';
    return () => {
      delete document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG];
    };
  }, []);

  useLayoutEffect(() => {
    const el = footerRef.current;
    if (!el) return;

    const writeMeasuredHeight = () => {
      const heightPx = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty(CSS_VAR_FOOTER_ISLAND_HEIGHT, `${heightPx}px`);
    };

    writeMeasuredHeight();

    const observer = new ResizeObserver(() => {
      writeMeasuredHeight();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(CSS_VAR_FOOTER_ISLAND_HEIGHT);
    };
  }, []);

  return (
    <footer
      ref={footerRef}
      className={joinClasses(
        FOOTER_ISLAND_CLASS,
        'ui-app-footer',
        'pointer-events-auto flex w-full shrink-0 flex-col items-stretch px-4 py-2',
        className
      )}
      style={style}
      aria-label={ariaLabel}
    >
      {children}
    </footer>
  );
}
