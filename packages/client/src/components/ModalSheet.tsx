import React from 'react';
import { X } from 'lucide-react';
import {
  ModalPortal,
  bottomSheetBackdropClass,
  bottomSheetHandleBarClass,
  bottomSheetHandleRowClass,
  bottomSheetPanelClass,
} from './Shared';
import { zIndex } from '../constants/zIndex';

export type ModalSheetZLayer = keyof typeof zIndex;

export type ModalSheetProps = {
  /** Sheet translate animation (same as existing bottom sheets) */
  open: boolean;
  /** Backdrop tap and optional X button */
  onClose: () => void;
  /** Defaults to `modal` */
  zLayer?: ModalSheetZLayer;
  /** Panel max width; `md` matches `bottomSheetPanelClass` default */
  maxWidth?: 'sm' | 'md' | 'lg';
  showHandle?: boolean;
  showClose?: boolean;
  closeAriaLabel?: string;
  /** Lucide X size when `showClose` */
  closeIconSize?: number;
  /** Extra classes on close button (e.g. `top-5 right-5`) */
  closeButtonClassName?: string;
  /** Appended to `bottomSheetPanelClass` (padding, layout, etc.) */
  panelClassName?: string;
  backdropClassName?: string;
  backdropStyle?: React.CSSProperties;
  backdropPosition?: 'fixed' | 'absolute';
  /** When true, wrap children in `px-5 pt-1 pb-safe-bottom-8` */
  paddedContent?: boolean;
  contentClassName?: string;
  /** When false, render overlay in-place (use inside an existing `ModalPortal`) */
  portal?: boolean;
  /** Override backdrop click (defaults to `onClose`) */
  onBackdropClick?: () => void;
  /** After stopping propagation on the panel (e.g. pause overlay resumes on panel tap) */
  onPanelClick?: () => void;
  children: React.ReactNode;
  role?: 'dialog' | 'alertdialog' | 'presentation';
  ariaModal?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
};

const maxWidthClass: Record<NonNullable<ModalSheetProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: '',
  lg: 'max-w-lg',
};

/**
 * Unified bottom sheet shell: portal, backdrop blur, slide-up panel, optional drag handle + X.
 * Does not import from `Shared` re-exports that depend on this file (avoid cycles).
 */
export function ModalSheet({
  open,
  onClose,
  zLayer = 'modal',
  maxWidth = 'md',
  showHandle = true,
  showClose = false,
  closeAriaLabel = 'Close',
  closeIconSize = 18,
  closeButtonClassName = 'absolute top-4 right-5 z-10 p-1 rounded-lg transition-colors text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface',
  panelClassName = '',
  backdropClassName = '',
  backdropStyle,
  backdropPosition = 'fixed',
  paddedContent = true,
  contentClassName,
  portal = true,
  onBackdropClick,
  onPanelClick,
  children,
  role = 'dialog',
  ariaModal = true,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalSheetProps) {
  const zClass = zIndex[zLayer];
  const mw = maxWidthClass[maxWidth];
  const panelExtras = [panelClassName, mw].filter(Boolean).join(' ');
  const backdropClick = onBackdropClick ?? onClose;

  const ariaModalProp = role === 'presentation' || ariaModal === false ? undefined : true;

  const inner = (
    <div
      className={bottomSheetBackdropClass(open, zClass, backdropPosition, backdropClassName)}
      style={backdropStyle}
      onClick={backdropClick}
      role="presentation"
    >
      <div
        className={bottomSheetPanelClass(open, panelExtras)}
        onClick={(e) => {
          e.stopPropagation();
          onPanelClick?.();
        }}
        role={role}
        aria-modal={ariaModalProp}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        {showHandle && (
          <div className={bottomSheetHandleRowClass} aria-hidden>
            <div className={bottomSheetHandleBarClass} />
          </div>
        )}
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className={closeButtonClassName}
            aria-label={closeAriaLabel}
          >
            <X size={closeIconSize} />
          </button>
        )}
        {paddedContent ? (
          <div
            className={['px-5 pt-1 pb-safe-bottom-8', contentClassName].filter(Boolean).join(' ')}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );

  if (!portal) {
    return inner;
  }
  return <ModalPortal>{inner}</ModalPortal>;
}
