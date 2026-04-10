import React, { useEffect, useState } from 'react';
import { useGame } from '../../../context/GameContext';
import { GameMode as ModeEnum } from '@alias/shared';

export const CountdownScreen = () => {
  const {
    currentTheme,
    startGameplay,
    playSound,
    gameMode,
    teams,
    currentTeamIndex,
    myPlayerId,
    currentRoundStats,
    settings,
  } = useGame();
  const [count, setCount] = useState(3);

  const isQuiz = settings.mode.gameMode === ModeEnum.QUIZ;

  const explainerId =
    currentRoundStats.explainerId ||
    (() => {
      const team = teams[currentTeamIndex];
      if (!team || team.players.length === 0) return '';
      return team.players[Math.min(team.nextPlayerIndex, team.players.length - 1)]?.id ?? '';
    })();
  const isActualExplainer = gameMode === 'OFFLINE' || explainerId === myPlayerId;

  useEffect(() => {
    if (count > 0) {
      playSound('tick');
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isQuiz || isActualExplainer) {
      startGameplay();
    }
  }, [count, startGameplay, playSound, isActualExplainer, isQuiz]);

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} justify-center items-center`}>
      {count > 0 ? (
        <span
          key={count}
          className={`text-[9rem] sm:text-[11rem] font-sans font-black tracking-tight animate-countdown-hit ${currentTheme.textMain}`}
        >
          {count}
        </span>
      ) : (
        <div className="flex flex-col items-center gap-4 animate-page-in">
          <span
            className={`text-[7rem] sm:text-[9rem] font-sans font-black tracking-tight ${currentTheme.textMain}`}
          >
            GO
          </span>
          <span
            className={`text-[10px] uppercase tracking-[0.5em] font-bold opacity-50 ${currentTheme.textMain} animate-pulse`}
          >
            {gameMode === 'OFFLINE' || isActualExplainer ? 'Starting…' : 'Waiting…'}
          </span>
        </div>
      )}
    </div>
  );
};
