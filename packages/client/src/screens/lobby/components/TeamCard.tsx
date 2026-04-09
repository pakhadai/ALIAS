import React from 'react';
import { Check, PencilLine } from 'lucide-react';
import type { GameActionPayload, Player, Team, ThemeConfig } from '../../../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { TRANSLATIONS } from '../../../constants';

type T = (typeof TRANSLATIONS)['EN'];

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

  const overfilled = team.players.length > Math.ceil(playersTotal / teamCount) + 1;

  return (
    <div
      className={`rounded-3xl border bg-(--ui-surface) p-4 ${
        overfilled ? 'border-[color-mix(in_srgb,var(--ui-warning)_40%,var(--ui-border))]' : 'border-(--ui-border)'
      }`}
      style={{ borderLeftWidth: '6px', borderLeftColor: team.colorHex || undefined }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${team.color}`} />

        {editingTeamId === team.id ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              value={teamNameDraft}
              onChange={(e) => setTeamNameDraft(e.target.value)}
              maxLength={18}
              className="flex-1 bg-transparent border-b border-(--ui-border) text-(--ui-fg) font-serif text-lg tracking-wide outline-none focus:border-(--ui-accent)"
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
              className="p-2 rounded-xl border border-(--ui-border) hover:bg-(--ui-surface-hover) transition-colors"
              aria-label="Save"
            >
              <Check size={16} className={theme.iconColor} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <p className={`font-serif text-lg ${theme.textMain} truncate`}>{team.name}</p>
            {isHost && (
              <button
                type="button"
                onClick={() => {
                  setEditingTeamId(team.id);
                  setTeamNameDraft(team.name);
                }}
                className="p-1.5 rounded-xl border border-(--ui-border) hover:bg-(--ui-surface-hover) transition-colors"
                aria-label="Rename team"
                title="Rename"
              >
                <PencilLine size={14} className={`${theme.iconColor} opacity-60`} />
              </button>
            )}
          </div>
        )}

        <span className="ml-auto text-[10px] text-(--ui-fg-muted) font-bold tracking-widest">
          {team.players.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {team.players.length === 0 ? (
          <span className="text-[10px] italic text-(--ui-fg-muted) opacity-70">{t.noPlayersInTeam}</span>
        ) : (
          team.players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (!canHostAssignOffline) return;
                onAssignPick(p);
              }}
              className={`px-3 py-1.5 rounded-full border border-(--ui-border) bg-(--ui-card) text-[10px] font-bold uppercase tracking-widest text-(--ui-fg-muted) inline-flex items-center gap-2 transition-all active:scale-[0.98] ${
                p.id === myPlayerId ? 'ring-2 ring-(--ui-accent-ring)' : ''
              } ${canHostAssignOffline ? 'hover:bg-(--ui-surface-hover)' : ''}`}
            >
              {p.avatarId != null ? <AvatarDisplay avatarId={p.avatarId} size={18} /> : <span>{p.avatar}</span>}
              <span className="max-w-[140px] truncate">{p.name}</span>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {isMine ? (
          <button
            type="button"
            onClick={() => sendAction({ action: 'TEAM_LEAVE' })}
            disabled={joinDisabled}
            className="flex-1 py-3 rounded-2xl border border-(--ui-border) bg-(--ui-surface) hover:bg-(--ui-surface-hover) text-[9px] uppercase tracking-widest font-bold text-(--ui-fg-muted) transition-all active:scale-[0.98] disabled:opacity-40"
          >
            Вийти
          </button>
        ) : (
          <button
            type="button"
            onClick={() => sendAction({ action: 'TEAM_JOIN', data: { teamId: team.id } })}
            disabled={joinDisabled}
            className={`flex-1 py-3 rounded-2xl text-[9px] uppercase tracking-widest font-bold transition-all active:scale-[0.98] disabled:opacity-40 ${
              overfilled
                ? 'border border-(--ui-border) bg-[color-mix(in_srgb,var(--ui-warning)_10%,var(--ui-surface))] text-(--ui-fg-muted)'
                : 'bg-(--ui-accent) text-(--ui-accent-contrast) border border-(--ui-accent)'
            }`}
          >
            Приєднатися
          </button>
        )}

        {overfilled && (
          <span className="text-[9px] uppercase tracking-widest font-bold text-(--ui-warning) opacity-90">
            Забагато
          </span>
        )}
      </div>
    </div>
  );
}

