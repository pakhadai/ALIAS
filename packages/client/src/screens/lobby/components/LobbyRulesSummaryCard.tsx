import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { GameMode } from '../../../types';
import type { GameSettings, ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import { typographyClass } from '../../../constants/typography';

type T = TranslationStrings;

export function rulesTimeRow(settings: GameSettings, t: T): { label: string; value: string } {
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
        <p className={`${typographyClass.label} tracking-[0.12em] text-ui-fg`}>
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
            <dd className={`${typographyClass.body} font-semibold text-ui-fg`}>{value}</dd>
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

const cardClassName =
  'w-full max-w-sm rounded-3xl border border-ui-border bg-ui-surface px-5 py-4 text-left';

export function LobbyRulesSummaryCard(props: {
  theme: ThemeConfig;
  t: T;
  settings: GameSettings;
  modeLabel: string;
  categoriesPreview: string;
  isHost: boolean;
  onOpenSettings?: () => void;
}): React.ReactNode {
  const { theme, t, settings, modeLabel, categoriesPreview, isHost, onOpenSettings } = props;

  const summary = (
    <LobbyRulesSummary
      theme={theme}
      t={t}
      settings={settings}
      modeLabel={modeLabel}
      categoriesPreview={categoriesPreview}
      isHost={isHost}
    />
  );

  if (isHost && onOpenSettings) {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className={`${cardClassName} hover:bg-ui-surface-hover transition-all active:scale-[0.99]`}
        data-testid="lobby-settings-chips"
        aria-label={`${t.lobbyRulesSummaryTitle ?? t.rules ?? 'Game rules'}. ${t.tapToEdit}`}
      >
        {summary}
      </button>
    );
  }

  return (
    <div className={cardClassName} data-testid="lobby-settings-chips">
      {summary}
    </div>
  );
}
