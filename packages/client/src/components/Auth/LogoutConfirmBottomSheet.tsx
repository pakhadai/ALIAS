import React from 'react';
import { Loader2 } from 'lucide-react';
import { ModalSheet } from '../ModalSheet';

export type LogoutConfirmBottomSheetProps = {
  sheetOpen: boolean;
  /** `aria-labelledby` — must be unique when multiple instances mount */
  titleId?: string;
  onRequestClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  loggingOut: boolean;
  title: string;
  cancelLabel: string;
  confirmLabel: string;
  loadingLabel: string;
  closeAriaLabel: string;
};

/** Shared logout confirmation — same layout and stacking as other nested sheets */
export function LogoutConfirmBottomSheet({
  sheetOpen,
  titleId = 'logout-confirm-title',
  onRequestClose,
  onCancel,
  onConfirm,
  loggingOut,
  title,
  cancelLabel,
  confirmLabel,
  loadingLabel,
  closeAriaLabel,
}: LogoutConfirmBottomSheetProps) {
  return (
    <ModalSheet
      open={sheetOpen}
      onClose={onCancel}
      onBackdropClick={onRequestClose}
      zLayer="modalNested"
      maxWidth="sm"
      showHandle
      showClose
      paddedContent={false}
      panelClassName="px-5 pt-0 pb-safe-bottom-8"
      closeAriaLabel={closeAriaLabel}
      ariaLabelledBy={titleId}
    >
      <p
        id={titleId}
        className="text-ui-fg text-sm font-sans font-semibold tracking-wide pr-12 mb-4"
      >
        {title}
      </p>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest bg-ui-surface text-ui-fg border border-ui-border hover:bg-ui-surface-hover transition-all active:scale-[0.98]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => void onConfirm()}
          disabled={loggingOut}
          className="w-full py-3 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest bg-[color-mix(in_srgb,var(--ui-danger)_18%,transparent)] text-ui-danger border border-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_24%,transparent)] transition-all active:scale-[0.98] disabled:opacity-40"
        >
          {loggingOut ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {loadingLabel}
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </ModalSheet>
  );
}
