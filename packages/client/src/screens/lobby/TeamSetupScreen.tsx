import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/Button';
import { AvatarDisplay } from '../../components/AvatarDisplay';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useT } from '../../hooks/useT';
import type { Player, Team } from '../../types';

function isPlayerSocketConnected(p: { isConnected?: boolean }): boolean {
  return p.isConnected !== false;
}

export const TeamSetupScreen = () => {
  const { teams, currentTheme, sendAction, setGameState, isHost, gameMode } = useGame();
  const t = useT();

  const allTeamsHavePlayers = teams.every((team) => team.players.length > 0);

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8`}>
      <header className="flex justify-between items-center py-6 mb-8">
        <button
          onClick={() => setGameState(GameState.LOBBY)}
          className="p-2 opacity-30 hover:opacity-100 transition-opacity"
        >
          <X size={20} className={currentTheme.iconColor} />
        </button>
        <h2
          className={`text-[10px] font-sans uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary}`}
        >
          {t.teams}
        </h2>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
        {teams.map((team: Team) => (
          <div
            key={team.id}
            className="p-6 rounded-3xl border border-(--ui-border) bg-(--ui-surface)"
            style={{ borderLeftWidth: '6px', borderLeftColor: team.colorHex || undefined }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${team.color}`} />
              <h3 className={`font-serif text-xl ${currentTheme.textMain}`}>{team.name}</h3>
              <span className={`ml-auto text-[10px] ${currentTheme.textSecondary}`}>
                ({team.players.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {team.players.map((p: Player) => {
                const online = gameMode === 'OFFLINE' || isPlayerSocketConnected(p);
                return (
                  <div
                    key={p.id}
                    className={`px-3 py-1.5 rounded-full flex items-center gap-2 border bg-(--ui-surface) border-(--ui-border) ${
                      gameMode === 'ONLINE' && !online
                        ? 'opacity-70 border-[color-mix(in_srgb,var(--ui-warning)_30%,transparent)]'
                        : ''
                    }`}
                  >
                    {p.avatarId != null ? (
                      <AvatarDisplay avatarId={p.avatarId} size={20} />
                    ) : (
                      <span>{p.avatar}</span>
                    )}
                    <span
                      className={`text-[10px] uppercase tracking-widest font-bold ${currentTheme.textSecondary}`}
                    >
                      {p.name}
                    </span>
                    {gameMode === 'ONLINE' && !online && (
                      <span className="text-[8px] font-bold uppercase text-(--ui-warning) opacity-90">
                        {t.playerDisconnected}
                      </span>
                    )}
                  </div>
                );
              })}
              {team.players.length === 0 && (
                <span className={`text-[10px] italic ${currentTheme.textSecondary} opacity-50`}>
                  {t.noPlayersInTeam}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer className="py-8 space-y-4">
        {isHost && (
          <button
            onClick={() => sendAction({ action: 'GENERATE_TEAMS' })}
            className={`w-full text-center text-[9px] uppercase tracking-[0.4em] font-bold opacity-30 hover:opacity-100 transition-opacity mb-4 ${currentTheme.textMain}`}
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
          <p className="text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse">
            {t.waitTeams}
          </p>
        )}
      </footer>
    </div>
  );
};
