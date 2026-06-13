import type { ReactNode } from 'react';
import { SCREEN_LAYOUT, type ScreenLayoutPreset } from '../../constants/screenLayout';
import { ScreenLayoutProvider } from '../../context/ScreenLayoutContext';
import { GlassChromePortal } from './GlassChromePortal';

export interface ScreenShellProps {
  children: ReactNode;
  className?: string;
  /**
   * SSOT body width + horizontal inset — syncs scroll column with browser {@link AppHeader} back rail.
   * Extra layout classes go in `contentClassName` (flex, gap, py, etc.).
   */
  layout?: ScreenLayoutPreset;
  /** Scrollable main column (default `true`). Safe-area padding on the scroll container. */
  scroll?: boolean;
  /** Sticky glass bar inside the scroll column — e.g. {@link GlassAppHeader}; content starts below it at scroll=0. */
  header?: ReactNode;
  /** Sticky glass footer inside the scroll column — e.g. {@link FixedBottomBar}; content scrolls above it. */
  footer?: ReactNode;
  /** Fixed liquid glass header outside scroll — expects `fixed` on {@link GlassAppHeader}; portaled to `document.body`. */
  headerFixed?: boolean;
  /** Fixed footer island outside scroll — e.g. {@link FooterIsland}; portaled to `document.body`. */
  footerFixed?: boolean;
  /** Extra classes on the scroll / main column (not the outer shell). */
  contentClassName?: string;
}

/** Fixed viewport height so the scroll column can shrink (`min-h-0`) and scroll. */
const SHELL_OUTER = 'flex flex-col h-full max-h-full w-full min-h-0 overflow-x-hidden';

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Body below sticky header — keeps header full width; `contentClassName` applies here only. */
const CONTENT_WRAP_BASE = 'flex w-full min-w-0 flex-1 flex-col';

/** Without `flex-1` so scroll height follows content + footer spacer (fixed island screens). */
const CONTENT_WRAP_SCROLL_BASE = 'flex w-full min-w-0 flex-col';

const contentWrapClass = (footerFixed: boolean, bodyClassName: string) =>
  joinClasses(footerFixed ? CONTENT_WRAP_SCROLL_BASE : CONTENT_WRAP_BASE, bodyClassName);

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
    hasFooter && !footerFixed ? null : footerFixed ? null : 'pb-safe-bottom',
  ]
    .filter(Boolean)
    .join(' ');

/** iOS/TMA WebView: padding-bottom on overflow containers is flaky — use an in-flow spacer. */
function FixedFooterScrollSpacer(): ReactNode {
  return (
    <div
      aria-hidden
      data-screen-shell-footer-spacer=""
      className="w-full shrink-0 pointer-events-none h-[var(--footer-island-scroll-padding)]"
    />
  );
}

/** Viewport-fixed chrome — portal escapes transformed ancestors for backdrop-filter. */
function renderFixedChrome(node: ReactNode): ReactNode {
  if (!node) return null;
  return <GlassChromePortal>{node}</GlassChromePortal>;
}

export function ScreenShell({
  children,
  className = '',
  layout,
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
  const layoutConfig = layout ? SCREEN_LAYOUT[layout] : null;
  const bodyClassName = joinClasses(layoutConfig?.bodyClassName, contentClassName);

  const shell = scroll ? (
    <div className={shellClass}>
      {headerFixed ? renderFixedChrome(header) : null}
      <div
        className={scrollColumnClass(hasHeader, hasFooter, headerFixed, footerFixed)}
        data-screen-shell-scroll=""
      >
        {headerFixed ? null : header}
        <div className={contentWrapClass(footerFixed, bodyClassName)}>
          {children}
          {footerFixed ? <FixedFooterScrollSpacer /> : null}
        </div>
        {footerFixed ? null : footer}
      </div>
      {footerFixed ? renderFixedChrome(footer) : null}
    </div>
  ) : (
    <div
      className={joinClasses(
        shellClass,
        hasHeader && !headerFixed
          ? undefined
          : headerFixed
            ? 'pt-[var(--app-page-header-height)]'
            : 'pt-safe-top',
        hasFooter && !footerFixed ? undefined : footerFixed ? undefined : 'pb-safe-bottom'
      )}
    >
      {headerFixed ? renderFixedChrome(header) : header}
      <div className={joinClasses('flex min-h-0 flex-1 flex-col overflow-hidden', bodyClassName)}>
        {children}
        {footerFixed ? <FixedFooterScrollSpacer /> : null}
      </div>
      {footerFixed ? renderFixedChrome(footer) : footer}
    </div>
  );

  return <ScreenLayoutProvider value={layoutConfig}>{shell}</ScreenLayoutProvider>;
}
