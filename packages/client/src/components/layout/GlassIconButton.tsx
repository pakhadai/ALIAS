import { forwardRef, type ReactNode } from 'react';
import { UI_APP_HEADER_SLOT_CLASS, UI_GLASS_ICON_BTN_CLASS } from './GlassAppHeader';

export interface GlassIconButtonProps {
  onClick: () => void;
  ariaLabel: string;
  testId?: string;
  align?: 'start' | 'end';
  ariaExpanded?: boolean;
  ariaHasPopup?: 'menu' | 'dialog' | boolean;
  children: ReactNode;
}

/** 44×44 tap target + 33px liquid glass chip — browser header icon controls. */
export const GlassIconButton = forwardRef<HTMLButtonElement, GlassIconButtonProps>(
  function GlassIconButton(
    { onClick, ariaLabel, testId, align = 'start', ariaExpanded, ariaHasPopup, children },
    ref
  ) {
    return (
      <button
        ref={ref}
        type="button"
        data-testid={testId}
        onClick={onClick}
        className={`${UI_APP_HEADER_SLOT_CLASS} flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center ${
          align === 'end' ? 'justify-end' : 'justify-start'
        } transition-transform duration-150 ease-out active:scale-95`}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
      >
        <span className={UI_GLASS_ICON_BTN_CLASS}>{children}</span>
      </button>
    );
  }
);
