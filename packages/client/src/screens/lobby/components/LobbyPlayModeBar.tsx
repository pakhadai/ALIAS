import React from 'react';
import { Plus, Shuffle } from 'lucide-react';
import type { ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import { typographyClass } from '../../../constants/typography';

const MAX_TEAMS = 10;
const MIN_TEAMS = 2;

type T = TranslationStrings;

export function LobbyPlayModeBar(props: {
  theme: ThemeConfig;
  t: T;
  isHost: boolean;
  isSolo: boolean;
  teamCount: number;
  onTeamModeChange: (mode: 'TEAMS' | 'SOLO') => void;
  onTeamCountChange: (count: number) => void;
  onShuffleUnassigned: () => void;
  shuffleDisabled: boolean;
}): React.ReactNode {
  const {
    theme,
    t,
    isHost,
    isSolo,
    teamCount,
    onTeamModeChange,
    onTeamCountChange,
    onShuffleUnassigned,
    shuffleDisabled,
  } = props;

  const segmentClass = (active: boolean) =>
    `flex-1 min-h-11 py-2.5 rounded-xl border ${typographyClass.system} font-bold tracking-wide transition-all active:scale-[0.98] ${
      active
        ? 'border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-ui-fg'
        : 'border-ui-border bg-ui-surface text-ui-fg-muted hover:bg-ui-surface-hover'
    }`;

  const teamsLabel = (t.lobbyTeamsCount ?? '{0} teams').replace('{0}', String(teamCount));

  return (
    <div
      className="w-full max-w-sm rounded-3xl border border-ui-border bg-ui-surface px-4 py-4 space-y-3"
      data-testid="lobby-play-mode-bar"
    >
      <p
        className={`${typographyClass.label} tracking-[0.2em] text-ui-fg-muted ${theme.textSecondary}`}
      >
        {t.lobbyPlayMode ?? t.teamMode ?? 'Play mode'}
      </p>

      {isHost ? (
        <div className="flex gap-2" role="group" aria-label={t.teamMode ?? 'Team mode'}>
          <button
            type="button"
            onClick={() => onTeamModeChange('SOLO')}
            className={segmentClass(isSolo)}
            aria-pressed={isSolo}
          >
            {t.teamModeSolo ?? 'Solo'}
          </button>
          <button
            type="button"
            onClick={() => onTeamModeChange('TEAMS')}
            className={segmentClass(!isSolo)}
            aria-pressed={!isSolo}
          >
            {t.teamModeTeams ?? 'Teams'}
          </button>
        </div>
      ) : (
        <p className={`${typographyClass.body} font-semibold ${theme.textMain}`}>
          {isSolo ? (t.teamModeSolo ?? 'Solo') : teamsLabel}
        </p>
      )}

      {!isSolo && isHost ? (
        <div className="space-y-3 pt-1 border-t border-ui-border">
          <div className="flex items-center justify-between gap-2">
            <span className={`${typographyClass.body} font-semibold text-ui-fg`}>
              {t.teamCount}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onTeamCountChange(Math.max(MIN_TEAMS, teamCount - 1))}
                disabled={teamCount <= MIN_TEAMS}
                className={`min-h-9 min-w-9 flex items-center justify-center rounded-xl border border-ui-border bg-ui-surface text-ui-fg-muted hover:bg-ui-surface-hover ${typographyClass.body} font-bold disabled:opacity-40`}
                aria-label={t.lobbyRemoveTeam ?? 'Remove team'}
              >
                −
              </button>
              <span
                className={`min-w-[2ch] text-center ${typographyClass.body} font-bold tabular-nums ${theme.textMain}`}
              >
                {teamCount}
              </span>
              <button
                type="button"
                onClick={() => onTeamCountChange(Math.min(MAX_TEAMS, teamCount + 1))}
                disabled={teamCount >= MAX_TEAMS}
                className={`min-h-9 min-w-9 flex items-center justify-center rounded-xl border border-ui-border bg-ui-surface text-ui-fg-muted hover:bg-ui-surface-hover ${typographyClass.body} font-bold disabled:opacity-40`}
                aria-label={t.lobbyAddTeam ?? 'Add team'}
              >
                <Plus size={14} className={theme.iconColor} aria-hidden />
              </button>
            </div>
          </div>
          <p className={`${typographyClass.label} leading-relaxed text-ui-fg-muted normal-case`}>
            {t.lobbyTeamAssignHint}
          </p>
          <button
            type="button"
            onClick={onShuffleUnassigned}
            disabled={shuffleDisabled}
            className={`w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-2xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover ${typographyClass.body} font-semibold text-ui-fg transition-all active:scale-[0.98] disabled:opacity-40`}
          >
            <Shuffle size={16} className={theme.iconColor} aria-hidden />
            {t.lobbyRandomTeams ?? t.shuffle}
          </button>
        </div>
      ) : null}

      {isSolo && isHost ? (
        <p
          className={`${typographyClass.label} leading-relaxed text-ui-fg-muted normal-case border-t border-ui-border pt-3`}
        >
          {t.teamModeSoloHint}
        </p>
      ) : null}
    </div>
  );
}
