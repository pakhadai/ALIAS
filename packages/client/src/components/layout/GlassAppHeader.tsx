import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  CSS_VAR_APP_PAGE_HEADER_HEIGHT,
  HEADER_ROW_MIN_PX,
  TG_CHROME_GUTTER_PX,
} from '../../constants/tmaLayoutConstants';
import { isTelegramMiniApp } from '../../hooks/useTelegramApp';

export interface GlassAppHeaderProps {
  children: ReactNode;
  className?: string;
  /** Fade from `--ui-bg` below the bar (mirrors {@link FixedBottomBar} gradient). */
  gradient?: boolean;
  style?: CSSProperties;
  /** Apply 80px inline padding on title row in TMA (native chrome clearance). */
  tgGutter?: boolean;
  /** Height of optional child row — sets `--ui-app-header-child-row-height`. */
  childRowHeightPx?: number;
  /** Hide chrome from assistive tech (e.g. frozen menu under EnterName sheet). */
  ariaHidden?: boolean;
}

/** Shared frosted panel — lobby start CTA, bottom sheets (`styles.css`). */
export const UI_GLASS_PANEL_CLASS = 'ui-glass-panel';

/** Full-width frosted header bar — device inset + title row clearance (OMR formula). */
export const UI_APP_HEADER_CLASS = 'ui-app-header';

export const UI_APP_HEADER_TITLE_ROW_CLASS = 'ui-app-header__title-row';
export const UI_APP_HEADER_CHILD_ROW_CLASS = 'ui-app-header__child-row';
export const UI_APP_HEADER_SLOT_CLASS = 'ui-app-header__slot';

const GRADIENT_CLASS =
  'bg-linear-to-b from-[color-mix(in_srgb,var(--ui-bg)_92%,transparent)] via-[color-mix(in_srgb,var(--ui-bg)_72%,transparent)] to-[color-mix(in_srgb,var(--ui-bg)_25%,transparent)]';

/** Device inset only — title row min-height absorbs TG chrome clearance (OMR formula). */
const HEADER_BASE = 'pointer-events-auto flex w-full shrink-0 flex-col pt-device-top';

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Document flag — `styles.css` offsets `--tma-toast-top` below the glass bar */
export const APP_HEADER_DOCUMENT_FLAG = 'appHeader';

export function GlassAppHeader({
  children,
  className = '',
  gradient = false,
  style,
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
        HEADER_BASE,
        gradient && GRADIENT_CLASS,
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
  gradient?: boolean;
  /** Hide header from assistive tech while overlay (e.g. EnterName) is open. */
  ariaHidden?: boolean;
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
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`${UI_APP_HEADER_SLOT_CLASS} min-h-11 min-w-11 flex items-center justify-center text-ui-fg-muted hover:text-ui-fg transition-colors active:scale-90`}
      aria-label={ariaLabel}
    >
      <X size={20} aria-hidden />
    </button>
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
  children: childRow,
  childRowHeightPx = DEFAULT_CHILD_ROW_HEIGHT_PX,
  tgChromeGutter = true,
  left,
  center,
  right,
  className,
  gradient,
  ariaHidden,
  'data-testid': dataTestId,
}: AppHeaderProps) {
  const isTelegram = isTelegramMiniApp();
  const applyTgGutter = isTelegram && tgChromeGutter;
  const centerContent = title ?? center;

  const leftSlot =
    left ??
    (isTelegram ? (
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

  const rightSlot =
    right ??
    (applyTgGutter ? (
      <TgChromeSpacer />
    ) : (
      <div className={`${UI_APP_HEADER_SLOT_CLASS} min-w-11`} aria-hidden />
    ));

  return (
    <GlassAppHeader
      className={className}
      gradient={gradient}
      tgGutter={applyTgGutter}
      childRowHeightPx={childRow ? childRowHeightPx : undefined}
      ariaHidden={ariaHidden}
    >
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
    </GlassAppHeader>
  );
}

/** TG gutter inline padding (px) — for tests and docs. */
export const TG_CHROME_GUTTER_INLINE_PX = TG_CHROME_GUTTER_PX;
