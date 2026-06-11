import React, { useMemo, useState } from 'react';
import { ChevronRight, UserPlus } from 'lucide-react';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import { GameMode } from '../../../types';
import type { GameSettings, ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import { LobbyInviteSheet } from './LobbyInviteSheet';
import { typographyClass } from '../../../constants/typography';

type T = TranslationStrings;

function rulesTimeRow(settings: GameSettings, t: T): { label: string; value: string } {
  const mode = settings.mode.gameMode ?? GameMode.CLASSIC;

  if (mode === GameMode.IMPOSTER && settings.mode.gameMode === GameMode.IMPOSTER) {
    const min = Math.round(settings.mode.imposterDiscussionTime / 60);
    return {
      label: t.imposterDiscussionTime ?? 'Discussion',
      value: `${min} ${t.min ?? 'хв'}`,
    };
  }

  if (mode === GameMode.QUIZ && settings.mode.gameMode === GameMode.QUIZ) {
    const timerMode = settings.mode.quizTimerMode ?? 'ROUND';
    const seconds =
      timerMode === 'PER_TASK' ? settings.mode.quizQuestionTime : settings.mode.quizRoundTime;
    return { label: t.roundTime, value: `${seconds}s` };
  }

  const seconds = 'classicRoundTime' in settings.mode ? settings.mode.classicRoundTime : 60;
  return { label: t.roundTime, value: `${seconds}s` };
}

function LobbyRulesSummary(props: {
  theme: ThemeConfig;
  t: T;
  settings: GameSettings;
  modeLabel: string;
  categoriesPreview: string;
  isHost: boolean;
}): React.ReactNode {
  const { theme, t, settings, modeLabel, categoriesPreview, isHost } = props;

  const timeRow = useMemo(() => rulesTimeRow(settings, t), [settings, t]);
  const goalValue = `${settings.general.scoreToWin} ${t.pts}`;
  const wordsValue = categoriesPreview || '—';

  const customDeckName = settings.general.customDeckName || settings.general.customDeckCode || '';
  const customDeckChip =
    settings.general.customDeckCode && customDeckName
      ? (t.customDeckChip ?? 'Custom: {0}').replace('{0}', customDeckName)
      : null;

  const rows: { label: string; value: string }[] = [
    { label: t.gameMode ?? 'Mode', value: modeLabel },
    timeRow,
    { label: t.scoreToWin, value: goalValue },
    { label: t.categories, value: wordsValue },
  ];

  return (
    <div className="space-y-3 text-left" data-testid="lobby-rules-summary">
      <div className="flex items-center justify-between gap-2">
        <p className={`${typographyClass.label} tracking-[0.12em] text-ui-fg ${theme.textMain}`}>
          {t.lobbyRulesSummaryTitle ?? t.rules ?? 'Game rules'}
        </p>
        {isHost ? (
          <ChevronRight
            size={18}
            className={`shrink-0 ${theme.iconColor} text-ui-fg-muted`}
            aria-hidden
          />
        ) : null}
      </div>

      <dl className="grid grid-cols-[minmax(0,42%)_1fr] gap-x-3 gap-y-2.5">
        {rows.map(({ label, value }) => (
          <React.Fragment key={label}>
            <dt className={`${typographyClass.label} text-ui-fg-muted normal-case`}>{label}</dt>
            <dd className={`${typographyClass.body} font-semibold text-ui-fg ${theme.textMain}`}>
              {value}
            </dd>
          </React.Fragment>
        ))}
      </dl>

      {customDeckChip ? (
        <span
          className={`inline-flex rounded-full border border-ui-border bg-ui-card px-3 py-1 ${typographyClass.label} tracking-wide text-ui-fg-muted`}
        >
          {customDeckChip}
        </span>
      ) : null}
    </div>
  );
}

export function OnlineLobbyIntro(props: {
  theme: ThemeConfig;
  t: T;
  roomCode: string;
  settings: GameSettings;
  modeLabel: string;
  categoriesPreview: string;
  qrCodeData: string;
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
    <LobbyRulesSummary
      theme={theme}
      t={t}
      settings={settings}
      modeLabel={modeLabel}
      categoriesPreview={categoriesPreview}
      isHost={isHost}
    />
  );

  const cardClassName =
    'w-full rounded-3xl border border-ui-border bg-ui-surface px-5 py-4 text-left';

  return (
    <div className="w-full max-w-sm space-y-4">
      <p
        className={`text-left ${typographyClass.label} tracking-[0.25em] text-ui-fg-muted ${theme.textSecondary}`}
      >
        {t.roomCode}
      </p>
      <div className="flex w-full items-stretch gap-2">
        <div
          data-testid="lobby-room-code"
          className="flex min-w-0 flex-[7] items-center justify-center rounded-2xl border border-ui-border bg-ui-surface px-4 py-3 shadow-[0_0_0_1px_color-mix(in_srgb,var(--ui-accent)_15%,transparent),0_4px_24px_-4px_color-mix(in_srgb,var(--ui-accent)_20%,transparent)]"
        >
          <span className={`text-4xl font-serif tracking-[0.125em] ${theme.textMain}`}>
            {roomCode}
          </span>
        </div>
        <button
          type="button"
          onClick={handleInviteClick}
          data-testid="lobby-invite-button"
          className="flex min-w-0 flex-[3] flex-col items-center justify-center gap-1 rounded-2xl border border-[color-mix(in_srgb,var(--ui-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--ui-accent)_16%,transparent)] px-2 py-3 hover:bg-[color-mix(in_srgb,var(--ui-accent)_22%,transparent)] transition-all active:scale-95 touch-manipulation"
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
          onShareLink={onShareLink}
          onInviteTelegram={onInviteTelegram}
          onShowQr={onShowQr}
        />
      ) : null}

      {isHost ? (
        <button
          type="button"
          onClick={onOpenSettings}
          className={`${cardClassName} hover:bg-ui-surface-hover transition-all active:scale-[0.99]`}
          data-testid="lobby-settings-chips"
          aria-label={`${t.lobbyRulesSummaryTitle ?? t.rules ?? 'Game rules'}. ${t.tapToEdit}`}
        >
          {rulesCard}
        </button>
      ) : (
        <div className={cardClassName} data-testid="lobby-settings-chips">
          {rulesCard}
        </div>
      )}
    </div>
  );
}
