import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  CSS_VAR_APP_PAGE_HEADER_HEIGHT,
  HEADER_ROW_MIN_PX,
  TG_CHROME_GUTTER_PX,
} from '../../constants/tmaLayoutConstants';
import type { ScreenLayoutContentRail } from '../../constants/screenLayout';
import { useScreenLayoutOptional } from '../../context/ScreenLayoutContext';
import { hasTelegramInitData } from '../../hooks/useTelegramApp';
import { AppHeaderOverflowMenu, type AppHeaderMenuItem } from './AppHeaderOverflowMenu';
import { GlassIconButton } from './GlassIconButton';

export type { AppHeaderMenuItem };

export interface GlassAppHeaderProps {
  children: ReactNode;
  className?: string;
  /**
   * @deprecated Feather is global via `.ui-app-header::after` in `styles/glass.css`.
   * Prop is ignored; kept for call-site compatibility.
   */
  gradient?: boolean;
  style?: CSSProperties;
  /** Viewport-fixed liquid glass bar (outside scroll — pair with {@link ScreenShell} `headerFixed`). */
  fixed?: boolean;
  /** Apply 80px inline padding on title row in TMA (native chrome clearance). */
  tgGutter?: boolean;
  /** Height of optional child row — sets `--ui-app-header-child-row-height`. */
  childRowHeightPx?: number;
  /** Hide chrome from assistive tech (e.g. frozen menu under EnterName sheet). */
  ariaHidden?: boolean;
}

/** Shared frosted panel — lobby start CTA, bottom sheets (`styles.css`). */
export const UI_GLASS_PANEL_CLASS = 'ui-glass-panel';

/** 33px circular liquid glass icon chip — browser header back (`styles.css`). */
export const UI_GLASS_ICON_BTN_CLASS = 'ui-glass-icon-btn';

/** Full-width frosted header bar — device inset + title row clearance (OMR formula). */
export const UI_APP_HEADER_CLASS = 'ui-app-header';

/** Fixed viewport liquid glass modifier — see `styles/glass.css`. */
export const UI_APP_HEADER_FIXED_CLASS = 'ui-app-header--fixed';

export const UI_APP_HEADER_TITLE_ROW_CLASS = 'ui-app-header__title-row';
export const UI_APP_HEADER_CHILD_ROW_CLASS = 'ui-app-header__child-row';
export const UI_APP_HEADER_SLOT_CLASS = 'ui-app-header__slot';
export const UI_APP_HEADER_CONTENT_RAIL_CLASS = 'ui-app-header__content-rail';
export const UI_APP_HEADER_CONTENT_RAIL_FULL_CLASS = 'ui-app-header__content-rail--full';
export const UI_APP_HEADER_CONTENT_RAIL_NARROW_CLASS = 'ui-app-header__content-rail--narrow';

export type AppHeaderContentRail = ScreenLayoutContentRail;

/** Pass-through chrome — interactive rows opt in (mirrors FooterIsland feather hit-testing). */
const HEADER_BASE = 'pointer-events-none flex w-full shrink-0 flex-col';

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Document flag — `styles.css` offsets `--tma-toast-top` below the glass bar */
export const APP_HEADER_DOCUMENT_FLAG = 'appHeader';

export function GlassAppHeader({
  children,
  className = '',
  gradient: _gradient = false,
  style,
  fixed = false,
  tgGutter = false,
  childRowHeightPx,
  ariaHidden,
}: GlassAppHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG] = 'true';
    return () => {
      delete document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG];
    };
  }, []);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const writeMeasuredHeight = () => {
      const heightPx = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty(CSS_VAR_APP_PAGE_HEADER_HEIGHT, `${heightPx}px`);
    };

    writeMeasuredHeight();

    const observer = new ResizeObserver(() => {
      writeMeasuredHeight();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(CSS_VAR_APP_PAGE_HEADER_HEIGHT);
    };
  }, []);

  const headerStyle: CSSProperties = {
    ...style,
    ...(childRowHeightPx != null
      ? { ['--ui-app-header-child-row-height' as string]: `${childRowHeightPx}px` }
      : {}),
  };

  return (
    <header
      ref={headerRef}
      aria-hidden={ariaHidden === true ? true : undefined}
      data-tg-gutter={tgGutter ? 'true' : undefined}
      className={joinClasses(
        UI_APP_HEADER_CLASS,
        fixed && UI_APP_HEADER_FIXED_CLASS,
        HEADER_BASE,
        className
      )}
      style={headerStyle}
    >
      {children}
    </header>
  );
}

export interface AppHeaderProps {
  /** Preset center slot — alternative to `center`. */
  title?: ReactNode;
  /** Browser back/close — hidden in TMA (native BackButton via `useTelegramBackButton`). */
  onBack?: () => void;
  /** Show `onBack` control outside Telegram Mini App. */
  showBackInBrowser?: boolean;
  /** Accessible label for browser back button. */
  backAriaLabel?: string;
  /** Override `data-testid` on browser back button (default `app-header-back`). */
  backTestId?: string;
  /** Browser overflow menu items — button always shown in browser; `right` prop takes priority. */
  menuItems?: AppHeaderMenuItem[];
  /** Accessible label for browser overflow menu button. */
  menuAriaLabel?: string;
  /** Show overflow menu outside Telegram Mini App. */
  showMenuInBrowser?: boolean;
  /** Override `data-testid` on browser overflow menu (default `app-header-menu`). */
  menuTestId?: string;
  /** Optional second row (search, tabs). */
  children?: ReactNode;
  /** Explicit height for `children` row. */
  childRowHeightPx?: number;
  /** 80px L/R clearance under native TG chrome in TMA. */
  tgChromeGutter?: boolean;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
  /** @deprecated Ignored — feather via `.ui-app-header::after` in `styles/glass.css`. */
  gradient?: boolean;
  /** Viewport-fixed liquid glass header. */
  fixed?: boolean;
  /** Hide header from assistive tech while overlay (e.g. EnterName) is open. */
  ariaHidden?: boolean;
  /** Override {@link ScreenShell} `layout` rail (prefer `layout` on shell). */
  contentRail?: AppHeaderContentRail;
  /** Override shell layout inset (`--ui-screen-inline-padding`). */
  contentInsetX?: string;
  /** Override shell layout md inset (`--ui-screen-inline-padding-md`). */
  contentInsetXMd?: string;
  'data-testid'?: string;
}

const DEFAULT_CHILD_ROW_HEIGHT_PX = HEADER_ROW_MIN_PX;

function BrowserBackButton({
  onClick,
  ariaLabel,
  testId = 'app-header-back',
}: {
  onClick: () => void;
  ariaLabel: string;
  testId?: string;
}) {
  return (
    <GlassIconButton onClick={onClick} ariaLabel={ariaLabel} testId={testId} align="start">
      <ArrowLeft size={16} strokeWidth={2} aria-hidden />
    </GlassIconButton>
  );
}

function TgChromeSpacer() {
  return <div className={`${UI_APP_HEADER_SLOT_CLASS} shrink-0`} aria-hidden />;
}

/** Three-column app header — 44×44 tap targets on sides; TMA gutter + browser back fallback. */
export function AppHeader({
  title,
  onBack,
  showBackInBrowser = true,
  backAriaLabel = 'Back',
  backTestId,
  menuItems,
  menuAriaLabel = 'More options',
  showMenuInBrowser = true,
  menuTestId,
  children: childRow,
  childRowHeightPx = DEFAULT_CHILD_ROW_HEIGHT_PX,
  tgChromeGutter = true,
  left,
  center,
  right,
  className,
  gradient,
  fixed,
  ariaHidden,
  contentRail: contentRailProp,
  contentInsetX: contentInsetXProp,
  contentInsetXMd: contentInsetXMdProp,
  'data-testid': dataTestId,
}: AppHeaderProps) {
  const screenLayout = useScreenLayoutOptional();
  const contentRail = contentRailProp ?? screenLayout?.contentRail ?? 'canonical';
  const contentInsetX = contentInsetXProp ?? screenLayout?.contentInsetX;
  const contentInsetXMd = contentInsetXMdProp ?? screenLayout?.contentInsetXMd;

  /** Real TMA session only — plain browser loads SDK stub with `platform` but empty initData. */
  const isTelegramSession = hasTelegramInitData();
  const applyTgGutter = isTelegramSession && tgChromeGutter;
  const centerContent = title ?? center;

  const leftSlot =
    left ??
    (isTelegramSession ? (
      applyTgGutter ? (
        <TgChromeSpacer />
      ) : (
        <div className={`${UI_APP_HEADER_SLOT_CLASS} min-w-11`} aria-hidden />
      )
    ) : onBack && showBackInBrowser ? (
      <BrowserBackButton onClick={onBack} ariaLabel={backAriaLabel} testId={backTestId} />
    ) : (
      <div className={`${UI_APP_HEADER_SLOT_CLASS} min-w-11`} aria-hidden />
    ));

  const showBrowserMenu = !isTelegramSession && showMenuInBrowser;

  const rightSlot =
    right ??
    (showBrowserMenu ? (
      <AppHeaderOverflowMenu
        items={menuItems ?? []}
        ariaLabel={menuAriaLabel}
        testId={menuTestId}
      />
    ) : applyTgGutter ? (
      <TgChromeSpacer />
    ) : (
      <div className={`${UI_APP_HEADER_SLOT_CLASS} min-w-11`} aria-hidden />
    ));

  const contentRailClass = joinClasses(
    UI_APP_HEADER_CONTENT_RAIL_CLASS,
    contentRail === 'full' && UI_APP_HEADER_CONTENT_RAIL_FULL_CLASS,
    contentRail === 'narrow' && UI_APP_HEADER_CONTENT_RAIL_NARROW_CLASS
  );

  const headerInsetStyle: CSSProperties | undefined =
    contentInsetX || contentInsetXMd
      ? {
          ...(contentInsetX ? { ['--ui-screen-inline-padding' as string]: contentInsetX } : {}),
          ...(contentInsetXMd
            ? { ['--ui-screen-inline-padding-md' as string]: contentInsetXMd }
            : {}),
        }
      : undefined;

  const chromeRows = (
    <>
      <div className={UI_APP_HEADER_TITLE_ROW_CLASS}>
        <div className={`${UI_APP_HEADER_SLOT_CLASS} shrink-0 items-center justify-start`}>
          {leftSlot}
        </div>
        <div data-testid={dataTestId} className="flex min-w-0 flex-1 items-center justify-center">
          {centerContent}
        </div>
        <div className={`${UI_APP_HEADER_SLOT_CLASS} shrink-0 items-center justify-end`}>
          {rightSlot}
        </div>
      </div>
      {childRow ? <div className={UI_APP_HEADER_CHILD_ROW_CLASS}>{childRow}</div> : null}
    </>
  );

  return (
    <GlassAppHeader
      className={className}
      gradient={gradient}
      fixed={fixed}
      tgGutter={applyTgGutter}
      childRowHeightPx={childRow ? childRowHeightPx : undefined}
      ariaHidden={ariaHidden}
      style={headerInsetStyle}
    >
      {applyTgGutter ? chromeRows : <div className={contentRailClass}>{chromeRows}</div>}
    </GlassAppHeader>
  );
}

/** TG gutter inline padding (px) — for tests and docs. */
export const TG_CHROME_GUTTER_INLINE_PX = TG_CHROME_GUTTER_PX;
