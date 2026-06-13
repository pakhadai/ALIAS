import React, { useState } from 'react';
import { Link2, Mail, QrCode } from 'lucide-react';
import { ModalSheet } from '../../../components/ModalSheet';
import { ModalOptionButton, ModalSheetTitle } from '../../../components/Shared';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import type { ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';

type T = TranslationStrings;

/** Mount when shown; unmount via `onDismiss` after exit animation (TMA-safe enter). */
export function LobbyInviteSheet(props: {
  onDismiss: () => void;
  theme: ThemeConfig;
  t: T;
  qrCodeData: string;
  onShareLink: () => void;
  onInviteTelegram: () => void;
  onShowQr: () => void;
}): React.ReactNode {
  const { onDismiss, theme, t, qrCodeData, onShareLink, onInviteTelegram, onShowQr } = props;
  const haptic = useHapticFeedback();
  const [open, setOpen] = useState(true);
  const requestClose = () => setOpen(false);

  const runAndClose = (action: () => void) => {
    haptic.impactOccurred('light');
    action();
    requestClose();
  };

  const runQrNested = () => {
    haptic.impactOccurred('light');
    if (!qrCodeData) return;
    onShowQr();
    requestClose();
  };

  return (
    <ModalSheet
      open={open}
      onClose={requestClose}
      onExited={onDismiss}
      onBackdropClick={requestClose}
      size="compact"
      ariaLabelledBy="lobby-invite-title"
      header={<ModalSheetTitle id="lobby-invite-title">{t.lobbyInvite}</ModalSheetTitle>}
    >
      <div data-testid="lobby-invite-sheet">
        <div className="space-y-2">
          <ModalOptionButton
            onClick={() => runAndClose(onInviteTelegram)}
            icon={<Mail size={18} className={theme.iconColor} aria-hidden />}
          >
            {t.lobbyInviteTelegram}
          </ModalOptionButton>
          <ModalOptionButton
            onClick={() => runAndClose(onShareLink)}
            icon={<Link2 size={18} className={theme.iconColor} aria-hidden />}
          >
            {t.lobbyInviteCopyLink}
          </ModalOptionButton>
          <ModalOptionButton
            onClick={runQrNested}
            disabled={!qrCodeData}
            icon={<QrCode size={18} className={theme.iconColor} aria-hidden />}
          >
            {t.lobbyInviteQr}
          </ModalOptionButton>
        </div>
      </div>
    </ModalSheet>
  );
}
