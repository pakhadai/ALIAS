import React from 'react';
import { Check, PencilLine } from 'lucide-react';
import type { GameActionPayload, Player, Team, ThemeConfig } from '../../../types';
import { PlayerAvatar } from '../../../components/AvatarDisplay';
import { Button } from '../../../components/Button';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import { HAPTIC, vibrate } from '../../../utils/haptics';
import type { TranslationStrings } from '../../../hooks/useT';
import { typographyClass } from '../../../constants/typography';

type T = TranslationStrings;

export function TeamCard(props: {
  team: Team;
  teamCount: number;
  playersTotal: number;
  t: T;
  theme: ThemeConfig;
  isHost: boolean;
  myPlayerId: string;
  isMine: boolean;
  joinDisabled: boolean;
  canHostAssignOffline: boolean;
  onAssignPick: (p: Player) => void;
  editingTeamId: string | null;
  teamNameDraft: string;
  setEditingTeamId: (id: string | null) => void;
  setTeamNameDraft: (v: string) => void;
  sendAction: (a: GameActionPayload) => void;
}): React.ReactNode {
  const {
    team,
    teamCount,
    playersTotal,
    t,
    theme,
    isHost,
    myPlayerId,
    isMine,
    joinDisabled,
    canHostAssignOffline,
    onAssignPick,
    editingTeamId,
    teamNameDraft,
    setEditingTeamId,
    setTeamNameDraft,
    sendAction,
  } = props;

  const haptic = useHapticFeedback();
  const isEmpty = team.players.length === 0;
  const overfilled = team.players.length > Math.ceil(playersTotal / teamCount) + 1;

  const handleTeamJoin = () => {
    haptic.impactOccurred('medium');
    vibrate(HAPTIC.lobbyTeamJoin);
    sendAction({ action: 'TEAM_JOIN', data: { teamId: team.id } });
  };

  return (
    <div
      className={`rounded-2xl border bg-ui-surface p-3 ${
        overfilled
          ? 'border-[color-mix(in_srgb,var(--ui-warning)_40%,var(--ui-border))]'
          : isEmpty
            ? 'border-dashed border-ui-border'
            : 'border-ui-border'
      }`}
      style={{ borderLeftWidth: '4px', borderLeftColor: team.colorHex || undefined }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: team.colorHex || undefined }}
        />

        {editingTeamId === team.id ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              value={teamNameDraft}
              onChange={(e) => setTeamNameDraft(e.target.value)}
              maxLength={18}
              className={`flex-1 bg-transparent border-b border-ui-border text-ui-fg ${typographyClass.bodyInput} tracking-wide outline-none focus:border-ui-accent`}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const nextName = teamNameDraft.trim().slice(0, 18);
                if (!nextName) return;
                sendAction({ action: 'TEAM_RENAME', data: { teamId: team.id, name: nextName } });
                setEditingTeamId(null);
                setTeamNameDraft('');
              }}
              className="min-h-11 min-w-11 px-0 shrink-0"
              aria-label={t.save}
            >
              <Check size={14} className={theme.iconColor} aria-hidden />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <p className={`${typographyClass.body} font-semibold text-ui-fg truncate`}>
              {team.name}
            </p>
            {isHost && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingTeamId(team.id);
                  setTeamNameDraft(team.name);
                }}
                className="min-h-11 min-w-11 px-0 shrink-0"
                aria-label={t.renameTeam}
                title={t.renameTeam}
              >
                <PencilLine
                  size={12}
                  className={`${theme.iconColor} text-ui-fg-muted`}
                  aria-hidden
                />
              </Button>
            )}
          </div>
        )}

        <span className={`ml-auto ${typographyClass.body} text-ui-fg-muted tabular-nums`}>
          {team.players.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {isEmpty ? (
          <span className={`${typographyClass.body} italic text-ui-fg-muted`}>
            {t.noPlayersInTeam}
          </span>
        ) : (
          team.players.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!canHostAssignOffline) return;
                onAssignPick(p);
              }}
              disabled={!canHostAssignOffline}
              className={`rounded-full px-2 py-1 font-sans normal-case tracking-normal gap-1.5 ${
                p.id === myPlayerId ? 'ring-2 ring-ui-accent-ring' : ''
              }`}
            >
              <PlayerAvatar player={p} size={16} emojiClassName="text-sm" />
              <span className="max-w-[80px] truncate">{p.name}</span>
            </Button>
          ))
        )}
      </div>

      <div className="mt-3">
        {isMine ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => sendAction({ action: 'TEAM_LEAVE' })}
            disabled={joinDisabled}
            className="font-sans normal-case tracking-normal"
          >
            {t.teamLeave}
          </Button>
        ) : overfilled ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={handleTeamJoin}
            disabled={joinDisabled}
            className="font-sans normal-case tracking-normal text-ui-warning"
          >
            {t.teamJoin}
          </Button>
        ) : isEmpty ? (
          <Button
            type="button"
            variant="tertiary"
            size="md"
            fullWidth
            onClick={handleTeamJoin}
            disabled={joinDisabled}
            className="font-sans normal-case tracking-normal text-ui-accent border-dashed"
          >
            {t.teamJoin}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            volume="cta"
            size="md"
            fullWidth
            themeClass={theme.button}
            onClick={handleTeamJoin}
            disabled={joinDisabled}
            className="font-sans normal-case tracking-normal"
          >
            {t.teamJoin}
          </Button>
        )}
      </div>
    </div>
  );
}
