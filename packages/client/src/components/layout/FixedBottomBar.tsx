import type { CSSProperties, ReactNode } from 'react';

export interface FixedBottomBarProps {
  children: ReactNode;
  className?: string;
  /** Fade from `--ui-bg` above the bar (PreRoundScreen pattern). */
  gradient?: boolean;
  /** `default` → `pb-safe-bottom`; `lg` → `pb-safe-bottom-8`. */
  padding?: 'default' | 'lg';
  contentClassName?: string;
  style?: CSSProperties;
}

const GRADIENT_CLASS =
  'bg-linear-to-t from-[color-mix(in_srgb,var(--ui-bg)_92%,transparent)] via-[color-mix(in_srgb,var(--ui-bg)_72%,transparent)] to-[color-mix(in_srgb,var(--ui-bg)_25%,transparent)]';

function joinClasses(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function FixedBottomBar({
  children,
  className = '',
  gradient = true,
  padding = 'default',
  contentClassName = 'mx-auto max-w-sm w-full',
  style,
}: FixedBottomBarProps) {
  const pbClass = padding === 'lg' ? 'pb-safe-bottom-8' : 'pb-safe-bottom';

  return (
    <div
      className={joinClasses(
        'pointer-events-none fixed bottom-0 left-0 right-0 p-6 pt-4',
        pbClass,
        gradient && GRADIENT_CLASS,
        className
      )}
      style={style}
    >
      <div className={joinClasses(contentClassName, 'pointer-events-auto')}>{children}</div>
    </div>
  );
}
