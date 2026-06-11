import React from 'react';
import { Check, PencilLine } from 'lucide-react';
import type { GameActionPayload, Player, Team, ThemeConfig } from '../../../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
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

  const joinVariant = overfilled
    ? 'border border-ui-border bg-ui-surface text-ui-warning'
    : isEmpty
      ? 'border border-dashed border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_8%,transparent)] text-ui-accent'
      : 'bg-ui-accent text-ui-accent-contrast border border-ui-accent';

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
            <button
              type="button"
              onClick={() => {
                const nextName = teamNameDraft.trim().slice(0, 18);
                if (!nextName) return;
                sendAction({ action: 'TEAM_RENAME', data: { teamId: team.id, name: nextName } });
                setEditingTeamId(null);
                setTeamNameDraft('');
              }}
              className="min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-ui-border hover:bg-ui-surface-hover transition-colors"
              aria-label={t.save}
            >
              <Check size={14} className={theme.iconColor} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <p className={`${typographyClass.body} font-semibold text-ui-fg truncate`}>
              {team.name}
            </p>
            {isHost && (
              <button
                type="button"
                onClick={() => {
                  setEditingTeamId(team.id);
                  setTeamNameDraft(team.name);
                }}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-ui-border hover:bg-ui-surface-hover transition-colors shrink-0"
                aria-label={t.renameTeam}
                title={t.renameTeam}
              >
                <PencilLine size={12} className={`${theme.iconColor} text-ui-fg-muted`} />
              </button>
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
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (!canHostAssignOffline) return;
                onAssignPick(p);
              }}
              className={`px-2 py-1 rounded-full border border-ui-border bg-ui-card ${typographyClass.body} text-ui-fg-muted inline-flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                p.id === myPlayerId ? 'ring-2 ring-ui-accent-ring' : ''
              } ${canHostAssignOffline ? 'hover:bg-ui-surface-hover' : ''}`}
            >
              {p.avatarId != null ? (
                <AvatarDisplay avatarId={p.avatarId} size={16} />
              ) : (
                <span className="text-sm">{p.avatar}</span>
              )}
              <span className="max-w-[80px] truncate">{p.name}</span>
            </button>
          ))
        )}
      </div>

      <div className="mt-3">
        {isMine ? (
          <button
            type="button"
            onClick={() => sendAction({ action: 'TEAM_LEAVE' })}
            disabled={joinDisabled}
            className={`w-full py-2.5 rounded-xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover ${typographyClass.body} font-medium text-ui-fg-muted transition-all active:scale-[0.98] disabled:text-ui-fg-muted`}
          >
            {t.teamLeave}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleTeamJoin}
            disabled={joinDisabled}
            className={`w-full py-2.5 rounded-xl ${typographyClass.body} font-medium transition-all active:scale-[0.98] disabled:text-ui-fg-muted ${joinVariant}`}
          >
            {t.teamJoin}
          </button>
        )}
      </div>
    </div>
  );
}
