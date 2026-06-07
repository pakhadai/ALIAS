import React, { useState } from 'react';
import { Link2, Mail, QrCode } from 'lucide-react';
import { ModalSheet } from '../../../components/ModalSheet';
import { ModalSheetTitle } from '../../../components/Shared';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import type { ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import { typographyClass } from '../../../constants/typography';

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

  const optionClass =
    'w-full min-h-11 flex items-center gap-3 px-4 py-3 rounded-2xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all active:scale-[0.98] disabled:text-ui-fg-muted disabled:bg-ui-surface disabled:hover:bg-ui-surface';

  return (
    <ModalSheet
      open={open}
      onClose={requestClose}
      onExited={onDismiss}
      onBackdropClick={requestClose}
      size="compact"
      ariaLabelledBy="lobby-invite-title"
      header={
        <ModalSheetTitle id="lobby-invite-title" themeClass={theme.textMain}>
          {t.lobbyInvite}
        </ModalSheetTitle>
      }
    >
      <div data-testid="lobby-invite-sheet">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => runAndClose(onInviteTelegram)}
            className={optionClass}
          >
            <Mail size={18} className={theme.iconColor} aria-hidden />
            <span className={`${typographyClass.body} font-semibold text-ui-fg`}>
              {t.lobbyInviteTelegram}
            </span>
          </button>
          <button type="button" onClick={() => runAndClose(onShareLink)} className={optionClass}>
            <Link2 size={18} className={theme.iconColor} aria-hidden />
            <span className={`${typographyClass.body} font-semibold text-ui-fg`}>
              {t.lobbyInviteCopyLink}
            </span>
          </button>
          <button
            type="button"
            onClick={runQrNested}
            disabled={!qrCodeData}
            className={optionClass}
          >
            <QrCode size={18} className={theme.iconColor} aria-hidden />
            <span className={`${typographyClass.body} font-semibold text-ui-fg`}>
              {t.lobbyInviteQr}
            </span>
          </button>
        </div>
      </div>
    </ModalSheet>
  );
}
