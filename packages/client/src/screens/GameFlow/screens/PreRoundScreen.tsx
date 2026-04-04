import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { GameState } from '../../../types';
import { useGame } from '../../../context/GameContext';
import { TRANSLATIONS } from '../../../constants';

export const PreRoundScreen = () => {
  const {
    currentTheme,
    teams,
    currentTeamIndex,
    settings,
    handleStartRound,
    setGameState,
    isHost,
    myPlayerId,
    gameMode,
    leaveRoom,
  } = useGame();
  const t = TRANSLATIONS[settings.language];
  const activeTeam = teams[currentTeamIndex];

  if (!activeTeam || activeTeam.players.length === 0) {
    return (
      <div
        className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 justify-center items-center text-center`}
      >
        <div className="space-y-8">
          <p className={`text-2xl ${currentTheme.textMain}`}>{t.noPlayersInTeam}</p>
          {isHost && (
            <Button themeClass={currentTheme.button} onClick={() => setGameState(GameState.LOBBY)}>
              {t.backToLobby}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const playerIdx = Math.min(activeTeam.nextPlayerIndex, activeTeam.players.length - 1);
  const explainer = activeTeam.players[playerIdx] || activeTeam.players[0];
  const isActualExplainer = explainer?.id === myPlayerId;

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 text-center relative`}>
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="space-y-8 animate-pop-in w-full max-w-sm">
          <h2
            className={`text-[10px] font-sans font-bold uppercase tracking-[0.6em] opacity-40 ${currentTheme.textMain}`}
          >
            {t.playingNow}
          </h2>
          <div className={`inline-block px-8 py-3 rounded-full border border-white/10 bg-white/5`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${activeTeam.color}`} />
              <span className={`font-serif text-3xl ${currentTheme.textMain}`}>
                {activeTeam.name}
              </span>
            </div>
          </div>

          <div className="pt-12 space-y-4 flex flex-col items-center">
            <div className="mb-1">
              {explainer.avatarId != null ? (
                <AvatarDisplay avatarId={explainer.avatarId} size={64} />
              ) : (
                <span className="text-6xl">{explainer.avatar}</span>
              )}
            </div>
            <p className={`text-5xl font-serif ${currentTheme.textMain}`}>{explainer.name}</p>
            <p
              className={`text-[10px] font-sans font-bold uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}
            >
              {t.explains}
            </p>
          </div>

          {gameMode === 'OFFLINE' && (
            <div
              className={`pt-8 text-[10px] font-sans font-bold uppercase tracking-[0.3em] opacity-50 ${currentTheme.textSecondary}`}
            >
              {t.passPhoneTo.replace('{0}', explainer.name)}
            </div>
          )}

          <div className={gameMode === 'OFFLINE' ? 'pt-6' : 'pt-12'}>
            {gameMode === 'OFFLINE' || isActualExplainer ? (
              <Button
                themeClass={currentTheme.button}
                size="xl"
                onClick={handleStartRound}
                fullWidth
              >
                {t.takePhone}
              </Button>
            ) : (
              <p
                className={`text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse ${currentTheme.textSecondary}`}
              >
                {t.waitAdmin}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none">
        <div className="max-w-sm mx-auto pointer-events-auto">
          <Button
            themeClass={currentTheme.button}
            variant="outline"
            fullWidth
            icon={<X size={18} />}
            onClick={leaveRoom}
          >
            {t.toMainMenu}
          </Button>
        </div>
      </div>
    </div>
  );
};
