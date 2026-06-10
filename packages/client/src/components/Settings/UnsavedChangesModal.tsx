import React from 'react';
import { Button } from '../Button';
import { ModalSheet } from '../ModalSheet';
import { ModalSheetTitle } from '../Shared';
import { typographyClass } from '../../constants/typography';
import type { ThemeConfig } from '../../types';

export interface UnsavedChangesModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  saveText: string;
  discardText: string;
  stayText: string;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  onStay: () => void;
  saving?: boolean;
  theme?: ThemeConfig;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  title,
  message,
  saveText,
  discardText,
  stayText,
  onSave,
  onDiscard,
  onStay,
  saving = false,
  theme,
}) => {
  const textMain = theme?.textMain ?? 'text-ui-fg';
  const textSecondary = theme?.textSecondary ?? 'text-ui-fg-muted';

  return (
    <ModalSheet
      open={isOpen}
      onClose={onStay}
      zLayer="modalConfirm"
      size="compact"
      backdropPosition="fixed"
      role="alertdialog"
      ariaLabelledBy="unsaved-modal-title"
      ariaDescribedBy="unsaved-modal-desc"
      header={
        <ModalSheetTitle id="unsaved-modal-title" as="h3" themeClass={textMain}>
          {title}
        </ModalSheetTitle>
      }
    >
      <p
        id="unsaved-modal-desc"
        className={`${textSecondary} mb-8 ${typographyClass.body} leading-relaxed tracking-wide font-light`}
      >
        {message}
      </p>
      <div className="flex flex-col gap-4">
        <Button
          variant="primary"
          fullWidth
          size="xl"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saveText}
        </Button>
        <Button variant="danger" fullWidth size="lg" disabled={saving} onClick={onDiscard}>
          {discardText}
        </Button>
        <Button variant="ghost" fullWidth size="lg" disabled={saving} onClick={onStay}>
          {stayText}
        </Button>
      </div>
    </ModalSheet>
  );
};
