import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../Button';
import { ModalSheet } from '../ModalSheet';
import { ModalSheetTitle } from '../Shared';

export type LogoutConfirmBottomSheetProps = {
  /** Called after exit animation — parent should unmount */
  onDismiss: () => void;
  /** `aria-labelledby` — must be unique when multiple instances mount */
  titleId?: string;
  onConfirm: () => void;
  loggingOut: boolean;
  title: string;
  cancelLabel: string;
  confirmLabel: string;
  loadingLabel: string;
  /** Solid red title + confirm (e.g. guest session reset) */
  solidDanger?: boolean;
};

/** Shared logout confirmation — same layout and stacking as other nested sheets */
export function LogoutConfirmBottomSheet({
  onDismiss,
  titleId = 'logout-confirm-title',
  onConfirm,
  loggingOut,
  title,
  cancelLabel,
  confirmLabel,
  loadingLabel,
  solidDanger = false,
}: LogoutConfirmBottomSheetProps) {
  const [open, setOpen] = useState(true);
  const requestClose = () => setOpen(false);

  return (
    <ModalSheet
      open={open}
      onClose={requestClose}
      onExited={onDismiss}
      onBackdropClick={requestClose}
      zLayer="modalNested"
      size="compact"
      ariaLabelledBy={titleId}
      header={
        <ModalSheetTitle
          id={titleId}
          themeClass={solidDanger ? '!text-[var(--ui-danger)]' : undefined}
        >
          {title}
        </ModalSheetTitle>
      }
    >
      <div className="flex flex-col gap-4">
        <Button
          variant={solidDanger ? 'dangerSolid' : 'danger'}
          fullWidth
          size="lg"
          disabled={loggingOut}
          onClick={() => void onConfirm()}
        >
          {loggingOut ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" aria-hidden />
              {loadingLabel}
            </span>
          ) : (
            confirmLabel
          )}
        </Button>
        <Button variant="ghost" fullWidth size="lg" onClick={requestClose} disabled={loggingOut}>
          <span className="opacity-40 hover:opacity-100 transition-opacity font-sans">
            {cancelLabel}
          </span>
        </Button>
      </div>
    </ModalSheet>
  );
}
