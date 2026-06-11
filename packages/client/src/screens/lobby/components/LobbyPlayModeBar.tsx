import React from 'react';
import { User, Users } from 'lucide-react';
import type { ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import { typographyClass } from '../../../constants/typography';

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
  const { theme, t, isHost, isSolo, teamCount, onTeamModeChange } = props;

  const segmentClass = (active: boolean) =>
    `flex-1 min-h-11 py-2.5 px-2 rounded-xl border ${typographyClass.system} font-bold tracking-wide transition-all active:scale-[0.98] ${
      active
        ? 'border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-ui-fg'
        : 'border-ui-border bg-ui-surface text-ui-fg-muted hover:bg-ui-surface-hover'
    }`;

  const teamsLabel = (t.lobbyTeamsCount ?? '{0} teams').replace('{0}', String(teamCount));
  const groupLabel = t.teamMode ?? t.lobbyPlayMode ?? 'Play format';

  return (
    <div
      className="w-full max-w-sm rounded-3xl border border-ui-border bg-ui-surface px-4 py-4 space-y-3"
      data-testid="lobby-play-mode-bar"
    >
      <p className={`${typographyClass.label} tracking-[0.15em] text-ui-fg`}>
        {t.lobbyPlayMode ?? 'How we play'}
      </p>

      {isHost ? (
        <div className="flex gap-2" role="group" aria-label={groupLabel}>
          <button
            type="button"
            onClick={() => onTeamModeChange('SOLO')}
            className={segmentClass(isSolo)}
            aria-pressed={isSolo}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <User size={15} className={theme.iconColor} aria-hidden />
              {t.teamModeSolo ?? 'Solo'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTeamModeChange('TEAMS')}
            className={segmentClass(!isSolo)}
            aria-pressed={!isSolo}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Users size={15} className={theme.iconColor} aria-hidden />
              {t.teamModeTeams ?? 'Teams'}
            </span>
          </button>
        </div>
      ) : (
        <p className={`${typographyClass.body} font-semibold text-center text-ui-fg`}>
          {isSolo ? (t.teamModeSolo ?? 'Solo') : teamsLabel}
        </p>
      )}
    </div>
  );
}
