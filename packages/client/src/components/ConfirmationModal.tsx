import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { ModalSheet } from './ModalSheet';
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
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }
    if (!shouldRender) return;
    setIsClosing(true);
    const t = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, 300);
    return () => clearTimeout(t);
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  const textMain = theme?.textMain || 'text-ui-fg';
  const textSecondary = theme?.textSecondary || 'text-ui-fg-muted';
  const sheetOpen = !isClosing;

  return (
    <ModalSheet
      open={sheetOpen}
      onClose={onCancel}
      zLayer="modalConfirm"
      backdropPosition="fixed"
      backdropClassName={backdropExtraClassName}
      showHandle
      paddedContent={false}
      panelClassName="px-8 pt-0 pb-safe-bottom text-center"
      role="alertdialog"
      ariaLabelledBy="confirm-modal-title"
      ariaDescribedBy="confirm-modal-desc"
    >
      <h3
        id="confirm-modal-title"
        className={`text-2xl md:text-3xl font-serif ${textMain} mb-4 tracking-wide leading-tight`}
      >
        {title}
      </h3>
      <p
        id="confirm-modal-desc"
        className={`${textSecondary} mb-8 text-sm font-sans leading-relaxed tracking-wide font-light px-1`}
      >
        {message}
      </p>
      <div className="flex flex-col gap-4">
        <Button variant={isDanger ? 'danger' : 'primary'} fullWidth size="xl" onClick={onConfirm}>
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
