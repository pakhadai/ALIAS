import React from 'react';
import { Button } from './Button';
import { ModalSheet } from './ModalSheet';
import { ModalSheetTitle } from './Shared';
import { typographyClass } from '../constants/typography';
import type { ThemeConfig } from '../types';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
  theme?: ThemeConfig;
  confirmText?: string;
  cancelText?: string;
  backdropExtraClassName?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDanger,
  theme,
  confirmText,
  cancelText,
  backdropExtraClassName,
}) => {
  const textMain = theme?.textMain || 'text-ui-fg';
  const textSecondary = theme?.textSecondary || 'text-ui-fg-muted';

  return (
    <ModalSheet
      open={isOpen}
      onClose={onCancel}
      zLayer="modalConfirm"
      size="compact"
      backdropPosition="fixed"
      backdropClassName={backdropExtraClassName}
      role="alertdialog"
      ariaLabelledBy="confirm-modal-title"
      ariaDescribedBy="confirm-modal-desc"
      header={
        <ModalSheetTitle id="confirm-modal-title" as="h3" themeClass={textMain}>
          {title}
        </ModalSheetTitle>
      }
    >
      <p
        id="confirm-modal-desc"
        className={`${textSecondary} mb-8 ${typographyClass.body} leading-relaxed tracking-wide font-light`}
      >
        {message}
      </p>
      <div className="flex flex-col gap-4">
        <Button
          variant={isDanger ? 'danger' : 'primary'}
          volume={isDanger ? undefined : 'cta'}
          themeClass={isDanger ? undefined : theme?.button}
          fullWidth
          size="lg"
          onClick={onConfirm}
        >
          {confirmText || (isDanger ? 'Yes, Exit' : 'Confirm')}
        </Button>
        <Button variant="ghost" fullWidth onClick={onCancel} size="lg">
          <span className="opacity-40 hover:opacity-100 transition-opacity font-sans">
            {cancelText || 'Go Back'}
          </span>
        </Button>
      </div>
    </ModalSheet>
  );
};
