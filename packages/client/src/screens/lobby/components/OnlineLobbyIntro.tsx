import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import type { GameSettings, ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import { LobbyInviteSheet } from './LobbyInviteSheet';
import { LobbyRulesSummaryCard } from './LobbyRulesSummaryCard';
import { typographyClass } from '../../../constants/typography';
import type { LobbyQrStatus } from '../useLobbyQrCode';

type T = TranslationStrings;

export function OnlineLobbyIntro(props: {
  theme: ThemeConfig;
  t: T;
  roomCode: string;
  settings: GameSettings;
  modeLabel: string;
  categoriesPreview: string;
  qrCodeData: string;
  qrStatus: LobbyQrStatus;
  onRetryQr: () => void;
  isHost: boolean;
  onShareLink: () => void;
  onInviteTelegram: () => void;
  onShowQr: () => void;
  onOpenSettings: () => void;
}): React.ReactNode {
  const {
    theme,
    t,
    roomCode,
    settings,
    modeLabel,
    categoriesPreview,
    qrCodeData,
    qrStatus,
    onRetryQr,
    isHost,
    onShareLink,
    onInviteTelegram,
    onShowQr,
    onOpenSettings,
  } = props;
  const haptic = useHapticFeedback();
  const [inviteSheetShown, setInviteSheetShown] = useState(false);

  const handleInviteClick = () => {
    haptic.impactOccurred('light');
    setInviteSheetShown(true);
  };

  const rulesCard = (
    <LobbyRulesSummaryCard
      theme={theme}
      t={t}
      settings={settings}
      modeLabel={modeLabel}
      categoriesPreview={categoriesPreview}
      isHost={isHost}
      onOpenSettings={isHost ? onOpenSettings : undefined}
    />
  );

  return (
    <div className="w-full max-w-sm space-y-4">
      <p className={`text-left ${typographyClass.label} tracking-[0.25em] text-ui-fg-muted`}>
        {t.roomCode}
      </p>
      <div className="flex w-full items-stretch gap-2">
        <div
          data-testid="lobby-room-code"
          className="flex min-w-0 flex-[7] items-center justify-center rounded-2xl border border-ui-border bg-ui-surface px-4 py-3 shadow-sm"
        >
          <span className={`text-4xl font-serif tracking-[0.125em] ${theme.textMain}`}>
            {roomCode}
          </span>
        </div>
        <button
          type="button"
          onClick={handleInviteClick}
          data-testid="lobby-invite-button"
          className="flex min-w-0 flex-[3] flex-col items-center justify-center gap-1 rounded-2xl border border-ui-border bg-ui-surface px-2 py-3 shadow-sm hover:bg-ui-surface-hover transition-all active:scale-95 touch-manipulation"
          aria-label={t.lobbyInviteFriends ?? t.lobbyInvite}
        >
          <UserPlus size={22} className={theme.iconColor} aria-hidden />
          <span
            className={`text-center ${typographyClass.label} font-sans font-semibold leading-tight text-ui-fg normal-case`}
          >
            {t.lobbyInviteFriends ?? t.lobbyInvite}
          </span>
        </button>
      </div>

      {inviteSheetShown ? (
        <LobbyInviteSheet
          onDismiss={() => setInviteSheetShown(false)}
          theme={theme}
          t={t}
          qrCodeData={qrCodeData}
          qrStatus={qrStatus}
          onShareLink={onShareLink}
          onInviteTelegram={onInviteTelegram}
          onShowQr={onShowQr}
          onRetryQr={onRetryQr}
        />
      ) : null}

      {rulesCard}
    </div>
  );
}
