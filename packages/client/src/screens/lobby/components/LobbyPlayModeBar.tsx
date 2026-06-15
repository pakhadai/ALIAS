import React from 'react';
import { Plus, Shuffle, User, Users } from 'lucide-react';
import type { ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import { Button } from '../../../components/Button';
import { SettingsChip } from '../../../components/Settings';
import { settingsChipLabelClass } from '../../../components/Settings/settingsChipStyles';
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
          <SettingsChip
            active={isSolo}
            aria-pressed={isSolo}
            className="flex-1 font-sans normal-case tracking-normal"
            onClick={() => onTeamModeChange('SOLO')}
          >
            <User size={15} className={theme.iconColor} aria-hidden />
            <span className={settingsChipLabelClass}>{t.teamModeSolo ?? 'Solo'}</span>
          </SettingsChip>
          <SettingsChip
            active={!isSolo}
            aria-pressed={!isSolo}
            className="flex-1 font-sans normal-case tracking-normal"
            onClick={() => onTeamModeChange('TEAMS')}
          >
            <Users size={15} className={theme.iconColor} aria-hidden />
            <span className={settingsChipLabelClass}>{t.teamModeTeams ?? 'Teams'}</span>
          </SettingsChip>
        </div>
      ) : (
        <p className={`${typographyClass.body} font-semibold text-center text-ui-fg`}>
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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onTeamCountChange(Math.max(MIN_TEAMS, teamCount - 1))}
                disabled={teamCount <= MIN_TEAMS}
                className="min-h-9 min-w-9 px-0 text-xl font-bold leading-none"
                aria-label={t.lobbyRemoveTeam ?? 'Remove team'}
              >
                −
              </Button>
              <span
                className={`min-w-[2ch] text-center ${typographyClass.body} font-bold tabular-nums text-ui-fg`}
              >
                {teamCount}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onTeamCountChange(Math.min(MAX_TEAMS, teamCount + 1))}
                disabled={teamCount >= MAX_TEAMS}
                className="min-h-9 min-w-9 px-0"
                aria-label={t.lobbyAddTeam ?? 'Add team'}
              >
                <Plus size={14} className={theme.iconColor} aria-hidden />
              </Button>
            </div>
          </div>
          <p className={`${typographyClass.label} leading-relaxed text-ui-fg-muted normal-case`}>
            {t.lobbyTeamAssignHint}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={onShuffleUnassigned}
            disabled={shuffleDisabled}
            className="font-sans normal-case tracking-normal gap-2"
          >
            <Shuffle size={16} className={theme.iconColor} aria-hidden />
            {t.lobbyRandomTeams ?? t.shuffle}
          </Button>
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
