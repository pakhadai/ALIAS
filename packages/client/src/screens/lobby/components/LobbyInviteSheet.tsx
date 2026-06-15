import React, { useState } from 'react';
import { Link2, Loader2, QrCode } from 'lucide-react';
import { ModalSheet } from '../../../components/ModalSheet';
import { TelegramIcon } from '../../../components/TelegramIcon';
import { ModalOptionButton, ModalSheetTitle } from '../../../components/Shared';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import type { ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import type { LobbyQrStatus } from '../useLobbyQrCode';

type T = TranslationStrings;

/** Mount when shown; unmount via `onDismiss` after exit animation (TMA-safe enter). */
export function LobbyInviteSheet(props: {
  onDismiss: () => void;
  theme: ThemeConfig;
  t: T;
  qrCodeData: string;
  qrStatus: LobbyQrStatus;
  onShareLink: () => void;
  onInviteTelegram: () => void;
  onShowQr: () => void;
  onRetryQr: () => void;
}): React.ReactNode {
  const {
    onDismiss,
    theme,
    t,
    qrCodeData,
    qrStatus,
    onShareLink,
    onInviteTelegram,
    onShowQr,
    onRetryQr,
  } = props;
  const haptic = useHapticFeedback();
  const [open, setOpen] = useState(true);
  const requestClose = () => setOpen(false);

  const runAndClose = (action: () => void) => {
    haptic.impactOccurred('light');
    action();
    requestClose();
  };

  const runQrAction = () => {
    haptic.impactOccurred('light');
    if (qrStatus === 'loading' || qrStatus === 'idle') return;
    if (qrStatus === 'error') {
      onRetryQr();
      return;
    }
    if (!qrCodeData) return;
    onShowQr();
    requestClose();
  };

  const qrLabel = qrStatus === 'error' ? t.lobbyQrRetry : t.lobbyInviteQr;

  const qrIcon =
    qrStatus === 'loading' ? (
      <Loader2 size={18} className={`animate-spin ${theme.iconColor}`} aria-hidden />
    ) : (
      <QrCode size={18} className={theme.iconColor} aria-hidden />
    );

  const qrDisabled = qrStatus === 'loading' || qrStatus === 'idle';

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
            icon={<TelegramIcon size={18} className={theme.iconColor} />}
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
            data-testid="lobby-invite-qr-button"
            onClick={runQrAction}
            disabled={qrDisabled}
            aria-busy={qrStatus === 'loading'}
            aria-label={qrStatus === 'loading' ? t.lobbyQrLoading : qrLabel}
            icon={qrIcon}
          >
            {qrLabel}
          </ModalOptionButton>
        </div>
      </div>
    </ModalSheet>
  );
}
