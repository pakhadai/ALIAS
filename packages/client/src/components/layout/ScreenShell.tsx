import type { ReactNode } from 'react';

export interface ScreenShellProps {
  children: ReactNode;
  className?: string;
  /** Scrollable main column (default `true`). Safe-area padding on the scroll container. */
  scroll?: boolean;
  /** Sticky glass bar inside the scroll column — e.g. {@link GlassAppHeader}; content starts below it at scroll=0. */
  header?: ReactNode;
  /** Sticky glass footer inside the scroll column — e.g. {@link FixedBottomBar}; content scrolls above it. */
  footer?: ReactNode;
  /** Fixed liquid glass header outside scroll — expects `fixed` on {@link GlassAppHeader}. */
  headerFixed?: boolean;
  /** Fixed footer island outside scroll — e.g. {@link FooterIsland}. */
  footerFixed?: boolean;
  /** Extra classes on the scroll / main column (not the outer shell). */
  contentClassName?: string;
}

/** Fixed viewport height so the scroll column can shrink (`min-h-0`) and scroll. */
const SHELL_OUTER =
  'flex flex-col h-[var(--tg-viewport-height,100dvh)] max-h-[var(--tg-viewport-height,100dvh)] w-full min-h-0 overflow-x-hidden';
/** Scroll column — vertical only; clip decorative bleed (start CTA ring, -mx strips). */
const scrollColumnClass = (
  hasHeader: boolean,
  hasFooter: boolean,
  headerFixed: boolean,
  footerFixed: boolean
) =>
  [
    'flex flex-col flex-1 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-y-contain overscroll-x-none [-webkit-overflow-scrolling:touch]',
    hasHeader && !headerFixed
      ? null
      : headerFixed
        ? 'pt-[var(--app-page-header-height)]'
        : 'pt-safe-top',
    hasFooter && !footerFixed
      ? null
      : footerFixed
        ? 'pb-[var(--footer-island-stack)]'
        : 'pb-safe-bottom',
  ]
    .filter(Boolean)
    .join(' ');

/** Body below sticky header — keeps header full width; `contentClassName` applies here only. */
const CONTENT_WRAP_BASE = 'flex w-full min-w-0 flex-1 flex-col';

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function ScreenShell({
  children,
  className = '',
  scroll = true,
  header,
  footer,
  headerFixed = false,
  footerFixed = false,
  contentClassName = '',
}: ScreenShellProps) {
  const shellClass = joinClasses(SHELL_OUTER, className);
  const hasHeader = Boolean(header);
  const hasFooter = Boolean(footer);

  if (scroll) {
    return (
      <div className={shellClass}>
        {headerFixed ? header : null}
        <div
          className={scrollColumnClass(hasHeader, hasFooter, headerFixed, footerFixed)}
          data-screen-shell-scroll=""
        >
          {headerFixed ? null : header}
          <div className={joinClasses(CONTENT_WRAP_BASE, contentClassName)}>{children}</div>
          {footerFixed ? null : footer}
        </div>
        {footerFixed ? footer : null}
      </div>
    );
  }

  return (
    <div
      className={joinClasses(
        shellClass,
        hasHeader && !headerFixed
          ? undefined
          : headerFixed
            ? 'pt-[var(--app-page-header-height)]'
            : 'pt-safe-top',
        hasFooter && !footerFixed
          ? undefined
          : footerFixed
            ? 'pb-[var(--footer-island-stack)]'
            : 'pb-safe-bottom'
      )}
    >
      {header}
      <div
        className={joinClasses('flex min-h-0 flex-1 flex-col overflow-hidden', contentClassName)}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}
