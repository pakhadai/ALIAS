
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Clock, X, Check, Trophy, Star, Pause, Play, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Confetti, FloatingParticle, MilestoneNotification } from '../components/Shared';
import { GameState, Player, Team, AppTheme } from '../types';
import { useGame } from '../context/GameContext';
import { TRANSLATIONS } from '../constants';
import { AvatarDisplay } from '../components/AvatarDisplay';

// VS Screen: Animated 1v1 / 1v1v1 matchup display
export const VSScreen = () => {
  const { teams, currentTheme, settings, sendAction, isHost } = useGame();
  const t = TRANSLATIONS[settings.language];
  const [showButton, setShowButton] = useState(false);

  const totalDelay = teams.length * 2 * 0.6;
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), totalDelay * 1000 + 400);
    return () => clearTimeout(timer);
  }, [totalDelay]);

  // Build animation elements: Player1, VS, Player2, [VS, Player3]
  const elements: { type: 'player' | 'vs'; player?: any; team?: any; delay: number }[] = [];
  teams.forEach((team, i) => {
    if (i > 0) {
      elements.push({ type: 'vs', delay: (i * 2 - 1) * 0.6 });
    }
    elements.push({ type: 'player', player: team.players[0], team, delay: i * 2 * 0.6 });
  });

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 justify-center items-center overflow-hidden`}>
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        {elements.map((el, i) => {
          if (el.type === 'vs') {
            return (
              <div
                key={`vs-${i}`}
                className="animate-vs-scale-in opacity-0"
                style={{ animationDelay: `${el.delay}s`, animationFillMode: 'forwards' }}
              >
                <span className="text-4xl font-black tracking-widest text-champagne-gold drop-shadow-lg">
                  {t.vs}
                </span>
              </div>
            );
          }
          const isFromLeft = elements.filter(e => e.type === 'player').indexOf(el) % 2 === 0;
          return (
            <div
              key={el.player?.id || i}
              className={`${isFromLeft ? 'animate-vs-from-left' : 'animate-vs-from-right'} opacity-0 w-full`}
              style={{ animationDelay: `${el.delay}s`, animationFillMode: 'forwards' }}
            >
              <div className={`flex items-center gap-5 ${isFromLeft ? 'justify-start' : 'justify-end'}`}>
                {isFromLeft ? (
                  <>
                    <div className={`w-4 h-4 rounded-full ${el.team?.color}`} />
                    {el.player?.avatarId != null
                      ? <AvatarDisplay avatarId={el.player.avatarId} size={56} />
                      : <span className="text-5xl">{el.player?.avatar}</span>}
                    <span className={`text-3xl font-serif font-bold tracking-wide ${currentTheme.textMain}`}>{el.player?.name}</span>
                  </>
                ) : (
                  <>
                    <span className={`text-3xl font-serif font-bold tracking-wide ${currentTheme.textMain}`}>{el.player?.name}</span>
                    {el.player?.avatarId != null
                      ? <AvatarDisplay avatarId={el.player.avatarId} size={56} />
                      : <span className="text-5xl">{el.player?.avatar}</span>}
                    <div className={`w-4 h-4 rounded-full ${el.team?.color}`} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`w-full max-w-sm mt-16 transition-all duration-500 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {isHost ? (
          <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={() => sendAction({ action: 'START_GAME' })}>
            {t.startGame}
          </Button>
        ) : (
          <p className={`text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse ${currentTheme.textSecondary}`}>
            {t.waitHost}
          </p>
        )}
      </div>
    </div>
  );
};

// Pre-Round Screen: Shows who's next
export const PreRoundScreen = () => {
  const { currentTheme, teams, currentTeamIndex, settings, handleStartRound, setGameState, isHost, gameMode } = useGame();
  const t = TRANSLATIONS[settings.language];
  const activeTeam = teams[currentTeamIndex];

  // Safety check: if team has no players, return to lobby
  if (!activeTeam || activeTeam.players.length === 0) {
    return (
      <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 justify-center items-center text-center`}>
        <div className="space-y-8">
          <p className={`text-2xl ${currentTheme.textMain}`}>{t.noPlayersInTeam}</p>
          {isHost && (
            <Button themeClass={currentTheme.button} onClick={() => setGameState(GameState.LOBBY)}>{t.backToLobby}</Button>
          )}
        </div>
      </div>
    );
  }

  const playerIdx = Math.min(activeTeam.nextPlayerIndex, activeTeam.players.length - 1);
  const explainer = activeTeam.players[playerIdx] || activeTeam.players[0];

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 justify-center items-center text-center`}>
      <div className="space-y-8 animate-pop-in">
        <h2 className={`text-[10px] font-sans font-bold uppercase tracking-[0.6em] opacity-40 ${currentTheme.textMain}`}>
          {t.playingNow}
        </h2>
        <div className={`inline-block px-8 py-3 rounded-full border border-white/10 bg-white/5`}>
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${activeTeam.color}`} />
                <span className={`font-serif text-3xl ${currentTheme.textMain}`}>{activeTeam.name}</span>
            </div>
        </div>

        <div className="pt-12 space-y-4 flex flex-col items-center">
            <div className="mb-1">
              {explainer.avatarId != null
                ? <AvatarDisplay avatarId={explainer.avatarId} size={64} />
                : <span className="text-6xl">{explainer.avatar}</span>}
            </div>
            <p className={`text-5xl font-serif ${currentTheme.textMain}`}>{explainer.name}</p>
            <p className={`text-[10px] font-sans font-bold uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}>
                {t.explains}
            </p>
        </div>

        {gameMode === 'OFFLINE' && (
          <div className={`pt-8 text-[10px] font-sans font-bold uppercase tracking-[0.3em] opacity-50 ${currentTheme.textSecondary}`}>
            {t.passPhoneTo.replace('{0}', explainer.name)}
          </div>
        )}

        <div className={gameMode === 'OFFLINE' ? 'pt-6' : 'pt-12'}>
            {isHost ? (
              <Button themeClass={currentTheme.button} size="xl" onClick={handleStartRound} fullWidth>
                  {t.takePhone}
              </Button>
            ) : (
              <p className={`text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse ${currentTheme.textSecondary}`}>
                {t.waitAdmin}
              </p>
            )}
        </div>
      </div>
    </div>
  );
};

// Countdown Screen before playing
export const CountdownScreen = () => {
  const { currentTheme, startGameplay, playSound, isHost } = useGame();
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      playSound('tick');
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isHost) {
      startGameplay();
    }
  }, [count, startGameplay, playSound, isHost]);

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} justify-center items-center`}>
      <span className={`text-[12rem] font-serif font-black animate-ping ${currentTheme.textMain}`}>
        {count}
      </span>
    </div>
  );
};

export const PlayingScreen = () => {
  const { currentTheme, teams, currentTeamIndex, playSound, timeLeft, setTimeLeft, settings, currentWord, handleCorrect, handleSkip, isHost, myPlayerId, gameState, currentRoundStats, isPaused, togglePause, gameMode, sendAction } = useGame();
  const t = TRANSLATIONS[settings.language];
  const [particles, setParticles] = useState<{ id: number, x: number, y: number, text: string, color: string }[]>([]);
  const actionProcessingRef = useRef(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const activeTeam = teams[currentTeamIndex];

  // Safety check: use useEffect instead of dispatching during render
  useEffect(() => {
    if (!activeTeam || activeTeam.players.length === 0) {
      setShouldRedirect(true);
    }
  }, [activeTeam]);

  useEffect(() => {
    if (shouldRedirect && isHost) {
      sendAction({ action: 'RESET_GAME' });
    }
  }, [shouldRedirect, isHost, sendAction]);

  if (!activeTeam || activeTeam.players.length === 0) {
    return null;
  }

  const playerIdx = Math.min(activeTeam.nextPlayerIndex, activeTeam.players.length - 1);
  const explainer = activeTeam.players[playerIdx] || activeTeam.players[0];
  const isActualExplainer = explainer?.id === myPlayerId;
  const isOnActiveTeam = activeTeam.players.some(p => p.id === myPlayerId);
  const is1v1 = teams.every(t => t.players.length <= 1);
  // 1v1 mode: opponent sees word + buttons; explainer sees nothing (explains verbally)
  // 2+ players per team: explainer + other teams see word; teammates guess (no word)
  const canSeeWord = gameMode === 'OFFLINE' || (is1v1 ? !isOnActiveTeam : isActualExplainer || !isOnActiveTeam);
  const canUseButtons = gameMode === 'OFFLINE' || (is1v1 ? !isOnActiveTeam : isActualExplainer);
  const isCriticalTime = timeLeft <= 10;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Both host and client run local timer for smooth display
  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused) return;
    const interval = window.setInterval(() => setTimeLeft((prev: number) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [gameState, isPaused, setTimeLeft]);

  // Host sends TIME_UP action when timer reaches 0 (this broadcasts to clients)
  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused) return;
    if (timeLeft <= 6 && timeLeft > 0 && settings.soundEnabled) playSound('tick');
    if (isHost && timeLeft === 0) {
        sendAction({ action: 'TIME_UP' });
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, [timeLeft, isHost, gameState, isPaused, settings.soundEnabled, playSound, sendAction]);

  const onAction = (type: 'correct' | 'skip', x: number, y: number) => {
      if (isPaused || actionProcessingRef.current) return;
      actionProcessingRef.current = true;

      if (type === 'correct') {
          handleCorrect();
          setParticles(prev => [...prev, { id: Date.now(), x, y, text: '+1', color: '#10b981' }]);
      } else {
          handleSkip();
          setParticles(prev => [...prev, { id: Date.now(), x, y, text: settings.skipPenalty ? '-1' : '0', color: '#ef4444' }]);
      }

      const ACTION_DEBOUNCE_MS = 300;
      setTimeout(() => {
          actionProcessingRef.current = false;
      }, ACTION_DEBOUNCE_MS);
  };

  return (
      <div className={`flex flex-col min-h-screen ${currentTheme.bg} ${currentTheme.textMain} font-sans antialiased h-screen w-full overflow-hidden relative transition-colors`}>
        {particles.map(p => <FloatingParticle key={p.id} {...p} onComplete={() => setParticles(prev => prev.filter(x => x.id !== p.id))} />)}

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[50] animate-fade-in">
            <div className={`${currentTheme.card} border border-white/10 rounded-[3rem] p-16 shadow-2xl text-center`}>
              <span className="material-symbols-outlined text-champagne-gold text-6xl mb-4 block">pause_circle</span>
              <p className={`text-2xl font-serif ${currentTheme.textMain} uppercase tracking-widest`}>{t.paused}</p>
              {isHost && (
                <p className={`text-[10px] ${currentTheme.textSecondary} uppercase tracking-wider mt-4`}>{t.tapResume}</p>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar Header */}
        <header className="w-full pt-12 px-6 pb-2 flex flex-col gap-6 z-20">
          <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full shadow-[0_0_10px_rgba(243,229,171,0.5)] transition-all duration-1000 ease-linear ${isCriticalTime ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-champagne-gold'}`}
              style={{ width: `${(timeLeft / settings.roundTime) * 100}%` }}
            />
          </div>

          <div className="flex justify-between items-center w-full">
            <div className={`text-champagne-gold font-sans font-light tracking-widest text-lg w-20 tabular-nums ${isCriticalTime ? 'text-red-500' : ''}`}>
              {formatTime(timeLeft)}
            </div>

            {isHost && (
              <button
                onClick={togglePause}
                className="w-10 h-10 flex items-center justify-center rounded-full active:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-champagne-gold text-2xl">
                  {isPaused ? 'play_arrow' : 'pause'}
                </span>
              </button>
            )}

            <div className="text-text-sub-dark font-sans text-sm tracking-wide w-20 text-right">
                {t.score}: <span className="text-white font-medium">{currentRoundStats.correct}</span>
            </div>
          </div>
        </header>

        {/* Word Card */}
        <main className="flex-1 flex flex-col items-center justify-center w-full px-8 relative z-10 pb-24">
            {canSeeWord ? (
                <div className="w-full max-w-sm aspect-[3/4] max-h-[55vh] bg-card-dark-bg rounded-[2rem] shadow-premium-card shadow-inner-glow flex items-center justify-center p-10 relative transform transition-all duration-300 border border-white/5 animate-pop-in">
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-[1px] bg-white/10"></div>
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-8 h-[1px] bg-white/10"></div>
                  <h2 className="text-premium-white font-serif font-bold text-4xl sm:text-5xl text-center leading-tight tracking-wider uppercase break-words w-full drop-shadow-md">
                      {currentWord}
                  </h2>
                </div>
            ) : (
                <div className="space-y-8 opacity-40 text-center animate-fade-in">
                    <AlertCircle size={64} className="mx-auto" />
                    <p className={`text-xl font-serif text-white`}>{is1v1 && isActualExplainer ? t.youExplain : t.youGuess}</p>
                    <p className={`text-[10px] uppercase tracking-widest font-bold text-text-sub-dark`}>{is1v1 && isActualExplainer ? t.explainHint : t.sayAloud}</p>
                </div>
            )}
        </main>

        {/* Action Buttons Footer */}
        {canUseButtons && (
          <footer className="w-full fixed bottom-0 left-0 z-20 h-24 sm:h-28 flex">
            <button
                onClick={(e) => onAction('skip', e.clientX, e.clientY)}
                className="flex-1 h-full bg-burgundy-deep hover:bg-[#351A1A] active:bg-[#201010] transition-colors flex flex-col items-center justify-center gap-2 group border-t border-white/5"
            >
              <span className="material-symbols-outlined text-burgundy-text text-3xl group-active:scale-90 transition-transform">close</span>
              <span className="text-burgundy-text/80 text-[10px] tracking-[0.25em] uppercase font-bold group-hover:text-burgundy-text transition-colors">
                {t.skip}
              </span>
            </button>
            <button
                onClick={(e) => onAction('correct', e.clientX, e.clientY)}
                className="flex-1 h-full bg-forest-green-deep hover:bg-[#263333] active:bg-[#182020] transition-colors flex flex-col items-center justify-center gap-2 group border-t border-white/5 border-l border-l-white/5"
            >
              <span className="material-symbols-outlined text-forest-green-text text-3xl group-active:scale-90 transition-transform font-bold">check</span>
              <span className="text-forest-green-text/80 text-[10px] tracking-[0.25em] uppercase font-bold group-hover:text-forest-green-text transition-colors">
                {t.correct}
              </span>
            </button>
          </footer>
        )}
      </div>
  );
};

export const RoundSummaryScreen = () => {
    const { currentTheme, teams, currentTeamIndex, currentRoundStats, settings, playSound, isHost, sendAction } = useGame();
    const t = TRANSLATIONS[settings.language];
    const [milestone, setMilestone] = useState<{points: number, team: string} | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const processingRef = useRef(false);

    const rawPoints = currentRoundStats.correct - (settings.skipPenalty ? currentRoundStats.skipped : 0);
    const points = Math.max(0, rawPoints);
    const activeTeam = teams[currentTeamIndex];
    const scoringTeam = teams.find(team => team.id === currentRoundStats.teamId) || activeTeam;

    const confirmRoundResults = () => {
        if (!isHost || isSubmitting || processingRef.current) return;
        processingRef.current = true;
        setIsSubmitting(true);

        // Check for milestone before confirming
        const oldScore = scoringTeam?.score || 0;
        const newScore = Math.max(0, oldScore + points);
        const oldTens = Math.floor(oldScore / 10);
        const newTens = Math.floor(newScore / 10);

        let delay = 0;
        if (newTens > oldTens && newScore < settings.scoreToWin) {
            setMilestone({ points: newTens * 10, team: scoringTeam?.name || '' });
            if (settings.soundEnabled) playSound('win');
            delay = 3000;
        }

        setTimeout(() => {
            // Use sendAction so it goes through handleGameAction and broadcasts
            sendAction({ action: 'CONFIRM_ROUND' });
            processingRef.current = false;
            setIsSubmitting(false);
        }, delay);
    };

    return (
      <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 relative`}>
        {milestone && <MilestoneNotification points={milestone.points} teamName={milestone.team} onComplete={() => setMilestone(null)} milestoneText={t.milestone} reachedText={t.teamReached} />}
        {points > 0 && <Confetti />}

        <header className="py-12 text-center space-y-4">
            <h2 className={`text-4xl font-serif tracking-widest uppercase ${currentTheme.textMain}`}>{t.timeIsUp}</h2>
            <div className={`inline-block px-6 py-2 rounded-full border border-white/10 bg-white/5`}>
                <span className={`text-[10px] font-sans font-bold uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}>
                    {t.playedTeam.replace('{0}', scoringTeam?.name || '')}
                </span>
            </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center space-y-12">
            <div className="text-center space-y-2">
                <span className={`text-8xl font-serif font-black ${currentTheme.textAccent}`}>{points}</span>
                <p className={`text-[10px] font-sans font-bold uppercase tracking-[0.5em] opacity-40 ${currentTheme.textMain}`}>{t.roundPoints}</p>
            </div>

            <div className="w-full max-w-xs space-y-3">
                <div className="flex justify-between items-center px-4 opacity-60">
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t.guessed}</span>
                    <span className="font-serif text-xl">{currentRoundStats.correct}</span>
                </div>
                <div className="flex justify-between items-center px-4 opacity-60">
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t.skippedWord}</span>
                    <span className="font-serif text-xl">{currentRoundStats.skipped}</span>
                </div>
            </div>
        </div>

        <div className="py-8">
           {isHost ? (
               <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={confirmRoundResults} disabled={!!milestone || isSubmitting}>
                   {t.continue}
               </Button>
           ) : (
               <div className={`text-center font-black uppercase tracking-widest text-xs animate-pulse ${currentTheme.textSecondary}`}>
                   {t.waitAdmin}
               </div>
           )}
        </div>
      </div>
    );
};

// Scoreboard Screen: Rankings with Path visualization
export const ScoreboardScreen = () => {
  const { teams, settings, handleNextRound, isHost } = useGame();
  const t = TRANSLATIONS[settings.language];

  const isDark = settings.theme === AppTheme.PREMIUM_DARK;
  const bgColor = isDark ? 'bg-premium-dark-bg' : 'bg-silver-bg';
  const textColor = isDark ? 'text-white' : 'text-premium-black';
  const subTextColor = isDark ? 'text-gray-400' : 'text-text-sub';

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => b.score - a.score), [teams]);
  const goal = settings.scoreToWin;

  return (
    <div className={`flex flex-col h-screen w-full ${bgColor} ${textColor} font-sans antialiased overflow-hidden transition-colors`}>
      {/* Header */}
      <header className="relative z-20 w-full px-6 pt-12 pb-2 flex justify-center items-center bg-transparent backdrop-blur-sm">
        <div className="text-center">
          <h2 className="font-serif text-lg tracking-widest uppercase">{t.score}</h2>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full relative overflow-y-auto no-scrollbar pb-32">
        {/* Visual Ladder/Path */}
        <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[350px] relative py-8">
          <div className="absolute top-4 flex flex-col items-center z-0 opacity-40">
            <span className="material-symbols-outlined mb-1 text-champagne-dark">emoji_events</span>
            <span className={`text-[10px] tracking-[0.2em] uppercase font-bold text-champagne-dark`}>{t.goal}: {goal}</span>
          </div>

          <div className="flex flex-col items-center h-[280px] w-full justify-between relative my-10 px-10">
            <div className={`absolute w-px h-full left-1/2 -translate-x-1/2 top-0 bottom-0 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>

            <div className={`w-3 h-3 rounded-full border-4 z-10 relative ${isDark ? 'bg-white/20 border-premium-dark-bg' : 'bg-gray-200 border-silver-bg'}`}></div>
            <div className={`w-2 h-2 rounded-full z-10 relative ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
            <div className={`w-2 h-2 rounded-full z-10 relative ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
            <div className={`w-2 h-2 rounded-full z-10 relative ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
            <div className={`w-2 h-2 rounded-full z-10 relative ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
            <div className={`w-3 h-3 rounded-full border-4 z-10 relative ${isDark ? 'bg-white/30 border-premium-dark-bg' : 'bg-gray-300 border-silver-bg'}`}></div>

            {teams.map((team, idx) => {
              const progress = Math.min(1, team.score / goal);
              const topPos = 100 - (progress * 100);
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={team.id}
                  className="absolute w-full h-0 z-20 flex justify-center transition-all duration-1000 ease-out"
                  style={{ top: `${topPos}%` }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white transition-transform hover:scale-110`}
                    style={{ backgroundColor: team.colorHex || '#888', color: isDark ? 'white' : 'black' }}
                  >
                    {idx + 1}
                  </div>
                  <div
                    className={`absolute top-0 -translate-y-1/2 px-2 py-1 rounded shadow-sm whitespace-nowrap ${isEven ? 'left-[calc(50%+24px)]' : 'right-[calc(50%+24px)]'} ${isDark ? 'bg-white/5 border border-white/5 text-white' : 'bg-white text-premium-black'}`}
                  >
                    <span className="text-[10px] font-bold tracking-wider">{team.score} {t.pts}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Team Cards */}
        <div className="w-full px-6 space-y-3 z-10">
          {sortedTeams.map((team, idx) => {
            const teamIndex = teams.findIndex(t => t.id === team.id) + 1;
            const progress = Math.min(100, (team.score / goal) * 100);

            return (
              <div
                key={team.id}
                className={`rounded-2xl p-4 shadow-card flex items-center justify-between border animate-slide-up transition-all`}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                  borderColor: team.score >= goal ? '#F3E5AB' : (isDark ? 'rgba(255,255,255,0.05)' : 'transparent'),
                  animationDelay: `${idx * 100}ms`
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                    style={{ backgroundColor: team.colorHex || '#888', color: isDark ? 'white' : 'black' }}
                  >
                    {teamIndex}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-serif text-lg tracking-wide ${textColor}`}>{team.name}</span>
                    <div className={`bg-gray-100 h-1 mt-1.5 rounded-full overflow-hidden w-24 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ backgroundColor: team.colorHex || '#888', width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`block text-2xl font-serif ${textColor}`}>{team.score}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest">{t.points}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer Button */}
      <footer className={`fixed bottom-0 w-full pt-8 pb-8 px-6 z-30 pointer-events-auto bg-gradient-to-t ${isDark ? 'from-premium-dark-bg via-premium-dark-bg' : 'from-silver-bg via-silver-bg'} to-transparent`}>
        {isHost ? (
          <button
            onClick={handleNextRound}
            className={`w-full h-14 rounded-full flex items-center justify-center transition-all active:scale-[0.98] shadow-soft hover:shadow-lg group ${isDark ? 'bg-champagne-gold text-premium-black' : 'bg-premium-black text-white'}`}
          >
            <span className="font-sans font-medium text-sm uppercase tracking-[0.2em] group-hover:tracking-[0.25em] transition-all">
              {t.nextRound}
            </span>
          </button>
        ) : (
          <p className={`text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse ${textColor}`}>
            {t.waitAdmin}
          </p>
        )}
      </footer>
    </div>
  );
};

// GameOver Screen: Winners
export const GameOverScreen = () => {
  const { teams, currentTheme, settings, resetGame, rematch, isHost } = useGame();
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === AppTheme.PREMIUM_DARK;
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const [copied, setCopied] = useState(false);

  // Collect top guessers across all teams
  const allPlayers = teams.flatMap(team => team.players.map((p: any) => ({ ...p, teamName: team.name })));
  const topGuessers = [...allPlayers]
    .filter((p: any) => (p.stats?.guessed ?? 0) > 0)
    .sort((a: any, b: any) => (b.stats?.guessed ?? 0) - (a.stats?.guessed ?? 0))
    .slice(0, 5);

  const handleShare = async () => {
    const lines = sorted.map((team, i) => {
      const medal = ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`;
      return `${medal} ${team.name}: ${team.score} ${t.pts}`;
    });
    const text = `🎮 ALIAS — ${t.finalResults}\n${lines.join('\n')}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const medals = ['🥇', '🥈', '🥉'];
  const cardBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm';

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} px-6 pt-12 items-center overflow-y-auto no-scrollbar`}
         style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
      <Confetti />

      {/* Winner banner */}
      <div className="w-full max-w-sm pb-6 text-center animate-slide-up">
        <Trophy size={56} className="text-yellow-500 mx-auto mb-4 animate-bounce" />
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-yellow-500 mb-2">{t.winners}</p>
        <h2 className={`text-4xl font-serif ${currentTheme.textMain}`}>{winner?.name}</h2>
      </div>

      {/* Team leaderboard */}
      <div className="w-full max-w-sm space-y-2 animate-fade-in">
        <p className={`text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 ${currentTheme.textMain}`}>
          {t.finalResults}
        </p>
        {sorted.map((team, i) => (
          <div key={team.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${cardBg}`}>
            <span className="text-xl w-7 text-center">{medals[i] ?? `${i + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm truncate ${currentTheme.textMain}`}>{team.name}</p>
              {team.players.length > 0 && (
                <p className={`text-[10px] truncate opacity-40 ${currentTheme.textMain}`}>
                  {team.players.map((p: any) => p.name).join(', ')}
                </p>
              )}
            </div>
            <span className={`font-bold text-base tabular-nums ${i === 0 ? 'text-yellow-500' : currentTheme.textMain}`}>
              {team.score} <span className="text-[10px] opacity-40">{t.pts}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Top guessers podium */}
      {topGuessers.length > 0 && (
        <div className="w-full max-w-sm mt-8 space-y-2 animate-fade-in">
          <p className={`text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 ${currentTheme.textMain}`}>
            {t.topGuessers ?? 'Top Guessers'}
          </p>
          {topGuessers.map((p: any, i) => (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${cardBg}`}>
              <span className="text-xl w-7 text-center">{medals[i] ?? `${i + 1}`}</span>
              {p.avatarId != null
                ? <AvatarDisplay avatarId={p.avatarId} size={32} />
                : <span className="text-2xl">{p.avatar}</span>}
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${currentTheme.textMain}`}>{p.name}</p>
                <p className={`text-[10px] truncate opacity-40 ${currentTheme.textMain}`}>{p.teamName}</p>
              </div>
              <div className="text-right">
                <span className={`font-bold text-base tabular-nums ${i === 0 ? 'text-[#D4AF6A]' : currentTheme.textMain}`}>
                  {p.stats?.guessed ?? 0}
                </span>
                <p className={`text-[9px] opacity-40 ${currentTheme.textMain}`}>
                  {t.guessedStat ?? 'guessed'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3 pt-6 pb-2">
        <button
          onClick={handleShare}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all text-[12px] font-bold uppercase tracking-widest ${isDark ? 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20' : 'border-slate-200 text-slate-400 hover:text-slate-600'}`}
        >
          {copied ? t.shareCopied : t.shareResults}
        </button>

        {isHost ? (
          <>
            <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={rematch}>
              {t.rematch}
            </Button>
            <button onClick={resetGame} className={`w-full py-3 text-[10px] uppercase tracking-[0.4em] font-bold opacity-30 hover:opacity-100 transition-opacity ${currentTheme.textMain}`}>
              {t.playAgain}
            </button>
          </>
        ) : (
          <p className="text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse">{t.waitAdmin}</p>
        )}
      </div>
    </div>
  );
};
