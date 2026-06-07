import type { ReactNode } from 'react';

export interface ScreenShellProps {
  children: ReactNode;
  className?: string;
  /** Scrollable main column (default `true`). Safe-area padding on the scroll container. */
  scroll?: boolean;
  /** Fixed bottom slot — use {@link FixedBottomBar} or custom footer. */
  footer?: ReactNode;
  /** Extra classes on the scroll / main column (not the outer shell). */
  contentClassName?: string;
}

const SHELL_MIN_HEIGHT = 'min-h-[var(--tg-viewport-height,100dvh)]';
const SCROLL_COLUMN =
  'flex-1 min-h-0 overflow-y-auto overscroll-y-contain pt-safe-top pb-safe-bottom [-webkit-overflow-scrolling:touch]';

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function ScreenShell({
  children,
  className = '',
  scroll = true,
  footer,
  contentClassName = '',
}: ScreenShellProps) {
  const shellClass = joinClasses(SHELL_MIN_HEIGHT, 'flex flex-col', className);

  if (scroll) {
    return (
      <div className={shellClass}>
        <div className={joinClasses(SCROLL_COLUMN, contentClassName)}>{children}</div>
        {footer}
      </div>
    );
  }

  return (
    <div className={joinClasses(shellClass, 'pt-safe-top pb-safe-bottom')}>
      <div className={joinClasses('flex min-h-0 flex-1 flex-col', contentClassName)}>
        {children}
      </div>
      {footer}
    </div>
  );
}
