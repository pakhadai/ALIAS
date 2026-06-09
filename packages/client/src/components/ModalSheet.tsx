import React, { useCallback, useEffect, useRef } from 'react';
import {
  ModalPortal,
  BottomSheetTopBar,
  bottomSheetBackdropClass,
  bottomSheetCloseButtonClass,
  bottomSheetPanelClass,
  type ModalSheetSize,
} from './Shared';
import { zIndex } from '../constants/zIndex';
import { BOTTOM_SHEET_ANIM_MS, useBottomSheetPresence } from '../hooks/useBottomSheetPresence';
import { useSheetDragToClose } from '../hooks/useSheetDragToClose';
import {
  keyboardAvoidingBottomPadding,
  useVisualViewportBottomInset,
} from '../hooks/useVisualViewportBottomInset';
import { modalSheetContentPadding, resolveModalSheetMaxWidth } from './ModalSheet.presets';

export type ModalSheetZLayer = keyof typeof zIndex;

export type { ModalSheetSize };

export type ModalSheetProps = {
  open: boolean;
  onClose: () => void;
  onExited?: () => void;
  zLayer?: ModalSheetZLayer;
  /** Panel width; omit to use size default (`compact`→`sm`, `default`/`tall`→`md`). */
  maxWidth?: 'sm' | 'md' | 'lg';
  /** Height + content padding preset. Default edge-to-edge sheet. */
  size?: ModalSheetSize;
  showClose?: boolean;
  closeAriaLabel?: string;
  closeIconSize?: number;
  closeDisabled?: boolean;
  closeButtonClassName?: string;
  /**
   * Escape hatch for layout edge cases only — prefer `size` preset.
   * Example: `// escape: tall split scroll + fixed footer in AppSettingsModal`
   */
  panelClassName?: string;
  backdropClassName?: string;
  backdropStyle?: React.CSSProperties;
  /**
   * Lift the sheet above the virtual keyboard via Visual Viewport API.
   * Default `true` — all ModalSheet consumers get keyboard-safe layout automatically.
   */
  keyboardAvoiding?: boolean;
  backdropPosition?: 'fixed' | 'absolute';
  /**
   * @deprecated Prefer built-in padding from `size`. Set `false` only when the consumer
   * owns scroll regions and `pb-modal-bottom` (e.g. tall split body/footer).
   */
  paddedContent?: boolean;
  contentClassName?: string;
  portal?: boolean;
  onBackdropClick?: () => void;
  onPanelClick?: () => void;
  dragToClose?: boolean;
  /** Title row under the drag handle — left-aligned, opposite optional ✕ */
  header?: React.ReactNode;
  headerClassName?: string;
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

export { BOTTOM_SHEET_ANIM_MS };

/** Scrollable body for `size="tall"` when `paddedContent={false}`. */
export function ModalSheetBody({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-sheet-scroll=""
      className={[
        'min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

/** Fixed footer block with canonical bottom inset (use with `paddedContent={false}` tall sheets). */
export function ModalSheetFooter({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={['shrink-0 pb-modal-bottom', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

/** Ignore backdrop dismiss briefly after open — prevents opener click / ghost tap from closing the sheet. */
const BACKDROP_DISMISS_GUARD_MS = 450;

export function ModalSheet({
  open,
  onClose,
  onExited,
  zLayer = 'modal',
  maxWidth,
  size = 'default',
  showClose = false,
  closeAriaLabel = 'Close',
  closeIconSize = 18,
  closeDisabled = false,
  closeButtonClassName = bottomSheetCloseButtonClass,
  panelClassName = '',
  backdropClassName = '',
  backdropStyle,
  keyboardAvoiding = true,
  backdropPosition = 'fixed',
  paddedContent = true,
  contentClassName,
  portal = true,
  onBackdropClick,
  onPanelClick,
  dragToClose = true,
  header,
  headerClassName,
  children,
  role = 'dialog',
  ariaModal = true,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalSheetProps) {
  const zClass = zIndex[zLayer];
  const resolvedMaxWidth = resolveModalSheetMaxWidth(size, maxWidth);
  const panelExtras = [panelClassName, maxWidthClass[resolvedMaxWidth]].filter(Boolean).join(' ');
  const mergedBackdropClass = backdropClassName;
  const backdropClick = onBackdropClick ?? onClose;
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const keyboardBottomInset = useVisualViewportBottomInset();
  const isKeyboardOpen = keyboardAvoiding && keyboardBottomInset > 0;
  const builtInKeyboardBackdropStyle = keyboardAvoiding
    ? keyboardAvoidingBottomPadding(keyboardBottomInset)
    : keyboardAvoidingBottomPadding(0);
  const mergedBackdropStyle: React.CSSProperties = {
    overflow: 'hidden',
    ...builtInKeyboardBackdropStyle,
    ...backdropStyle,
  };
  const openedAtRef = useRef(0);
  const wasKeyboardOpenRef = useRef(false);
  const isTallSheet = size === 'tall';

  const { mounted, visible } = useBottomSheetPresence(open, { onExited });

  useEffect(() => {
    if (visible) openedAtRef.current = performance.now();
  }, [visible]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (performance.now() - openedAtRef.current < BACKDROP_DISMISS_GUARD_MS) return;
      backdropClick();
    },
    [backdropClick]
  );
  const drag = useSheetDragToClose({
    enabled: dragToClose && visible,
    onDismiss: onClose,
    panelRef,
  });

  const ariaModalProp = role === 'presentation' || ariaModal === false ? undefined : true;

  useEffect(() => {
    const keyboardJustToggled = isKeyboardOpen !== wasKeyboardOpenRef.current;
    wasKeyboardOpenRef.current = isKeyboardOpen;
    if (!keyboardJustToggled) return;

    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop) return;
    backdrop.scrollTop = 0;
    if (panel) panel.scrollTop = 0;
    const scrollBody = panel?.querySelector<HTMLElement>('[data-sheet-scroll]');
    if (scrollBody) scrollBody.scrollTop = 0;
  }, [isKeyboardOpen]);

  if (!mounted) {
    return null;
  }

  const contentPadding = modalSheetContentPadding(size);

  const inner = (
    <div
      ref={backdropRef}
      data-bottom-sheet-backdrop=""
      data-keyboard-open={isKeyboardOpen ? 'true' : 'false'}
      data-open={visible ? 'true' : 'false'}
      className={bottomSheetBackdropClass(zClass, backdropPosition, mergedBackdropClass)}
      style={mergedBackdropStyle}
      onClick={visible ? handleBackdropClick : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        data-open={visible ? 'true' : 'false'}
        data-dragging={drag.isDragging ? 'true' : 'false'}
        data-sheet-scroll={isTallSheet ? '' : undefined}
        className={bottomSheetPanelClass(panelExtras, size)}
        style={drag.panelStyle}
        onClick={(e) => {
          e.stopPropagation();
          onPanelClick?.();
        }}
        {...drag.dragHandlers}
        role={role}
        aria-modal={ariaModalProp}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        <BottomSheetTopBar
          title={header}
          headerClassName={headerClassName}
          showClose={showClose}
          onClose={onClose}
          closeAriaLabel={closeAriaLabel}
          closeIconSize={closeIconSize}
          closeDisabled={closeDisabled}
          closeButtonClassName={closeButtonClassName}
        />
        {paddedContent ? (
          <div className={[contentPadding, contentClassName].filter(Boolean).join(' ')}>
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
