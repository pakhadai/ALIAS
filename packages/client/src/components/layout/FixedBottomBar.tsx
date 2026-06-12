import type { CSSProperties, ReactNode } from 'react';
import { FooterIsland } from './FooterIsland';

/** Full-width frosted footer bar — sticky inside scroll; mirrors {@link UI_APP_HEADER_CLASS}. */
export const UI_APP_FOOTER_CLASS = 'ui-app-footer';

export interface FixedBottomBarProps {
  children: ReactNode;
  className?: string;
  /** Sticky glass overlay (lobby start CTA); content scrolls underneath. */
  glass?: boolean;
  /** Fixed full-width glass footer — viewport-fixed feather bar (pair with {@link ScreenShell} `footerFixed`). */
  island?: boolean;
  /** Fade from `--ui-bg` above the bar (PreRoundScreen pattern). Ignored when `glass` or `island`. */
  gradient?: boolean;
  /** `default` → `pb-safe-bottom`; `lg` → `pb-safe-bottom-8`. Ignored when `island`. */
  padding?: 'default' | 'lg';
  contentClassName?: string;
  style?: CSSProperties;
}

const GRADIENT_CLASS =
  'bg-linear-to-t from-[color-mix(in_srgb,var(--ui-bg)_92%,transparent)] via-[color-mix(in_srgb,var(--ui-bg)_72%,transparent)] to-[color-mix(in_srgb,var(--ui-bg)_25%,transparent)]';

const IN_FLOW_BASE = 'pointer-events-none shrink-0 w-full overflow-x-hidden pt-4 px-4';

const GLASS_BASE = 'pointer-events-none shrink-0 w-full px-4 pt-3';

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function FixedBottomBar({
  children,
  className = '',
  glass = false,
  island = false,
  gradient = true,
  padding = 'default',
  contentClassName = 'mx-auto max-w-sm w-full',
  style,
}: FixedBottomBarProps) {
  if (island) {
    return (
      <FooterIsland className={className} style={style}>
        <div className={joinClasses(contentClassName, 'min-w-0 w-full')}>{children}</div>
      </FooterIsland>
    );
  }

  const pbClass = padding === 'lg' ? 'pb-safe-bottom-8' : 'pb-safe-bottom';

  return (
    <div
      className={joinClasses(
        glass ? joinClasses(UI_APP_FOOTER_CLASS, GLASS_BASE) : IN_FLOW_BASE,
        pbClass,
        !glass && gradient && GRADIENT_CLASS,
        className
      )}
      style={style}
    >
      <div
        className={joinClasses('mx-auto w-full min-w-0', contentClassName, 'pointer-events-auto')}
      >
        {children}
      </div>
    </div>
  );
}
