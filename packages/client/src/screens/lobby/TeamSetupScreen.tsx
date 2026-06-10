import React, { useMemo, useState } from 'react';
import { PencilLine, Check, MoveRight } from 'lucide-react';
import { Button } from '../../components/Button';
import { AvatarDisplay } from '../../components/AvatarDisplay';
import { AppHeader, FixedBottomBar, ScreenShell } from '../../components/layout';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useT } from '../../hooks/useT';
import type { Player, Team } from '../../types';
import { typographyClass } from '../../constants/typography';
import { buildTeamShells } from '../../utils/buildTeamShells';

function isPlayerSocketConnected(p: { isConnected?: boolean }): boolean {
  return p.isConnected !== false;
}

export const TeamSetupScreen = () => {
  const { teams, settings, currentTheme, sendAction, setGameState, isHost, gameMode, setTeams } =
    useGame();
  const t = useT();
  const general = settings.general;

  const displayTeams = useMemo(
    () =>
      buildTeamShells({
        teams,
        teamCount: general.teamCount,
        teamMode: general.teamMode ?? 'TEAMS',
        language: general.language,
      }),
    [teams, general.teamCount, general.teamMode, general.language]
  );

  const allTeamsHavePlayers = displayTeams.every((team) => team.players.length > 0);
  const canEdit = isHost && gameMode === 'OFFLINE';
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<{
    playerId: string;
    fromTeamId: string;
  } | null>(null);

  const teamIndexById = useMemo(() => {
    const m = new Map<string, number>();
    displayTeams.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [displayTeams]);

  const goBackToLobby = () => setGameState(GameState.LOBBY);

  const applyRename = () => {
    if (!canEdit) return;
    if (!editingTeamId) return;
    const nextName = teamNameDraft.trim().slice(0, 18);
    if (!nextName) return;
    const idx = teamIndexById.get(editingTeamId);
    if (idx == null) return;
    const next = displayTeams.map((tm) =>
      tm.id === editingTeamId ? { ...tm, name: nextName } : tm
    );
    setTeams(next);
    setEditingTeamId(null);
    setTeamNameDraft('');
  };

  const moveSelectedTo = (toTeamId: string) => {
    if (!canEdit) return;
    if (!selectedPlayer) return;
    if (toTeamId === selectedPlayer.fromTeamId) return;
    const fromIdx = teamIndexById.get(selectedPlayer.fromTeamId);
    const toIdx = teamIndexById.get(toTeamId);
    if (fromIdx == null || toIdx == null) return;

    const fromTeam = displayTeams[fromIdx];
    const toTeam = displayTeams[toIdx];
    if (!fromTeam || !toTeam) return;
    const p = fromTeam.players.find((pp) => pp.id === selectedPlayer.playerId);
    if (!p) return;

    const next = displayTeams.map((tm) => {
      if (tm.id === fromTeam.id)
        return { ...tm, players: tm.players.filter((pp) => pp.id !== p.id) };
      if (tm.id === toTeam.id) return { ...tm, players: [...tm.players, p] };
      return tm;
    });
    setTeams(next);
    setSelectedPlayer(null);
  };

  return (
    <ScreenShell
      className={currentTheme.bg}
      contentClassName="px-8 space-y-6 pb-4"
      headerFixed
      footerFixed
      header={
        <AppHeader
          fixed
          title={
            <h2
              className={`${typographyClass.label} font-sans tracking-[0.4em] ${currentTheme.textSecondary}`}
            >
              {t.teams}
            </h2>
          }
          onBack={goBackToLobby}
          backAriaLabel={t.backToLobby}
        />
      }
      footer={
        <FixedBottomBar island contentClassName="w-full space-y-4">
          {canEdit && (
            <p
              className={`text-center ${typographyClass.label} tracking-[0.35em] ${currentTheme.textSecondary}`}
            >
              {t.teamSetupTapHint}
            </p>
          )}
          {isHost && (
            <button
              type="button"
              onClick={() => sendAction({ action: 'GENERATE_TEAMS' })}
              className={`w-full text-center ${typographyClass.label} tracking-[0.35em] ${currentTheme.textSecondary} hover:text-ui-fg transition-colors`}
            >
              {t.shuffle}
            </button>
          )}
          {isHost ? (
            <Button
              themeClass={currentTheme.button}
              fullWidth
              size="xl"
              onClick={() => sendAction({ action: 'START_GAME' })}
              disabled={!allTeamsHavePlayers}
            >
              {t.startGame}
            </Button>
          ) : (
            <p
              className={`text-center ${typographyClass.label} tracking-widest animate-pulse ${currentTheme.textSecondary}`}
            >
              {t.waitTeams}
            </p>
          )}
        </FixedBottomBar>
      }
    >
      {displayTeams.map((team: Team) => {
        const isDropTarget =
          canEdit && selectedPlayer != null && selectedPlayer.fromTeamId !== team.id;
        return (
          <div
            key={team.id}
            className={`p-6 rounded-3xl border bg-ui-surface transition-[border-color,box-shadow,background-color] duration-200 ${
              isDropTarget
                ? 'border-2 border-dashed border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_12%,var(--ui-surface))] shadow-[0_0_0_3px_color-mix(in_srgb,var(--ui-accent)_18%,transparent)] motion-safe:animate-pulse'
                : 'border border-ui-border'
            }`}
            style={{ borderLeftWidth: '6px', borderLeftColor: team.colorHex || undefined }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: team.colorHex || undefined }}
              />
              {editingTeamId === team.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={teamNameDraft}
                    onChange={(e) => setTeamNameDraft(e.target.value)}
                    className="flex-1 bg-transparent border-b border-ui-border text-ui-fg font-serif text-xl tracking-wide outline-none focus:border-ui-accent"
                    autoFocus
                    maxLength={18}
                  />
                  <button
                    type="button"
                    onClick={applyRename}
                    className="min-h-11 min-w-11 inline-flex shrink-0 items-center justify-center rounded-xl border border-ui-border hover:bg-ui-surface-hover transition-colors"
                    aria-label="Save"
                  >
                    <Check size={18} className={currentTheme.iconColor} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className={`font-serif text-xl ${currentTheme.textMain} truncate`}>
                    {team.name}
                  </h3>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeamId(team.id);
                        setTeamNameDraft(team.name);
                      }}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-ui-border text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover transition-colors"
                      aria-label={t.renameTeam}
                      title={t.renameTeam}
                    >
                      <PencilLine size={18} className={currentTheme.iconColor} />
                    </button>
                  )}
                </div>
              )}
              <span
                className={`ml-auto ${typographyClass.label} normal-case ${currentTheme.textSecondary}`}
              >
                ({team.players.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {team.players.map((p: Player) => {
                const online = gameMode === 'OFFLINE' || isPlayerSocketConnected(p);
                const isSelected = selectedPlayer?.playerId === p.id;
                return (
                  <div
                    key={p.id}
                    role={canEdit ? 'button' : undefined}
                    tabIndex={canEdit ? 0 : undefined}
                    onClick={() => {
                      if (!canEdit) return;
                      setSelectedPlayer((cur) =>
                        cur?.playerId === p.id ? null : { playerId: p.id, fromTeamId: team.id }
                      );
                    }}
                    onKeyDown={(e) => {
                      if (!canEdit) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedPlayer((cur) =>
                          cur?.playerId === p.id ? null : { playerId: p.id, fromTeamId: team.id }
                        );
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full flex items-center gap-2 border bg-ui-surface border-ui-border transition-all ${
                      gameMode === 'ONLINE' && !online
                        ? 'opacity-70 border-[color-mix(in_srgb,var(--ui-warning)_30%,transparent)]'
                        : ''
                    } ${isSelected ? 'border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)]' : ''}`}
                  >
                    {p.avatarId != null ? (
                      <AvatarDisplay avatarId={p.avatarId} size={20} />
                    ) : (
                      <span>{p.avatar}</span>
                    )}
                    <span
                      className={`${typographyClass.label} tracking-widest ${currentTheme.textSecondary}`}
                    >
                      {p.name}
                    </span>
                    {gameMode === 'ONLINE' && !online && (
                      <span className={`${typographyClass.label} text-ui-warning`}>
                        {t.playerDisconnected}
                      </span>
                    )}
                  </div>
                );
              })}
              {team.players.length === 0 && (
                <span
                  className={`${typographyClass.label} italic normal-case ${currentTheme.textSecondary}`}
                >
                  {t.noPlayersInTeam}
                </span>
              )}
            </div>

            {canEdit && selectedPlayer && selectedPlayer.fromTeamId !== team.id && (
              <button
                type="button"
                onClick={() => moveSelectedTo(team.id)}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all active:scale-[0.98]"
              >
                <MoveRight size={16} className={currentTheme.iconColor} />
                <span className={`${typographyClass.label} tracking-[0.28em] text-ui-fg-muted`}>
                  {t.teamSetupMoveHere}
                </span>
              </button>
            )}
          </div>
        );
      })}
    </ScreenShell>
  );
};
