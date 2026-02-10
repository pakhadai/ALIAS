
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Clock, X, Check, Trophy, Star, Pause, Play, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Confetti, FloatingParticle, MilestoneNotification } from '../components/Shared';
import { GameState, Player, Team, AppTheme } from '../types';
import { useGame } from '../context/GameContext';
import { TRANSLATIONS } from '../constants';

// Pre-Round Screen: Shows who's next
export const PreRoundScreen = () => {
  const { currentTheme, teams, currentTeamIndex, settings, handleStartRound } = useGame();
  const t = TRANSLATIONS[settings.language];
  const activeTeam = teams[currentTeamIndex];
  const explainer = activeTeam.players[activeTeam.nextPlayerIndex];

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

        <div className="pt-12 space-y-4">
            <p className={`text-5xl font-serif ${currentTheme.textMain}`}>{explainer.name}</p>
            <p className={`text-[10px] font-sans font-bold uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}>
                {t.explains}
            </p>
        </div>

        <div className="pt-12">
            <Button themeClass={currentTheme.button} size="xl" onClick={handleStartRound} fullWidth>
                {t.takePhone}
            </Button>
        </div>
      </div>
    </div>
  );
};

// Countdown Screen before playing
export const CountdownScreen = () => {
  const { currentTheme, startGameplay, playSound } = useGame();
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      playSound('tick');
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      startGameplay();
    }
  }, [count, startGameplay, playSound]);

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} justify-center items-center`}>
      <span className={`text-[12rem] font-serif font-black animate-ping ${currentTheme.textMain}`}>
        {count}
      </span>
    </div>
  );
};

export const PlayingScreen = () => {
  const { currentTheme, teams, currentTeamIndex, playSound, timeLeft, setTimeLeft, settings, currentWord, setGameState, handleCorrect, handleSkip, isHost, myPlayerId, gameState, currentRoundStats, isPaused, togglePause, gameMode } = useGame();
  const t = TRANSLATIONS[settings.language];
  const [particles, setParticles] = useState<{ id: number, x: number, y: number, text: string, color: string }[]>([]);
  const actionProcessingRef = useRef(false);
  const activeTeam = teams[currentTeamIndex];
  const explainer = teams.every(t => t.players.length === 1) ? activeTeam.players[0] : activeTeam.players[activeTeam.nextPlayerIndex];
  const isExplainer = gameMode === 'OFFLINE' || explainer.id === myPlayerId;
  const isCriticalTime = timeLeft <= 10;
  
  /**
   * 2.2 ВИПРАВЛЕНО: Таймер працює ТІЛЬКИ на хості. Клієнти отримують дані через мережу.
   */
  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused || !isHost) return;
    const interval = window.setInterval(() => setTimeLeft((prev: number) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [gameState, isPaused, setTimeLeft, isHost]); 

  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused) return;
    if (timeLeft <= 6 && timeLeft > 0 && settings.soundEnabled) playSound('tick');
    if (isHost && timeLeft === 0) {
        playSound('end');
        setGameState(GameState.ROUND_SUMMARY);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, [timeLeft, isHost, gameState, isPaused, settings.soundEnabled, playSound, setGameState]);

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
      setTimeout(() => { actionProcessingRef.current = false; }, 250);
  };

  return (
      <div className={`flex flex-col min-h-screen ${currentTheme.bg} relative overflow-hidden transition-colors`}>
        {particles.map(p => <FloatingParticle key={p.id} {...p} onComplete={() => setParticles(prev => prev.filter(x => x.id !== p.id))} />)}
        
        <div className="h-3 bg-black/30 w-full">
            <div 
                className={`h-full transition-all duration-1000 ease-linear ${isCriticalTime ? 'bg-red-500' : currentTheme.progressBar}`} 
                style={{ width: `${(timeLeft / settings.roundTime) * 100}%` }} 
            />
        </div>

        <div className="flex justify-between items-center p-6">
           <div className={`flex items-center space-x-3 bg-black/20 px-4 py-2 rounded-full border border-white/10 ${isCriticalTime ? 'animate-shake border-red-500/50' : ''}`}>
               <Clock size={20} />
               <span className="font-mono font-black text-2xl">{timeLeft}</span>
           </div>
           {isHost && (
            <button onClick={togglePause} className="p-3 bg-white/5 rounded-full border border-white/10 active:scale-90 transition-all">
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </button>
           )}
        </div>

        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {isExplainer ? (
                <div className="space-y-12 w-full animate-pop-in">
                    <h2 className={`text-6xl font-serif tracking-tight ${currentTheme.textMain}`}>
                        {currentWord}
                    </h2>
                    <div className="flex gap-6 pt-12">
                        <Button 
                            variant="danger" 
                            fullWidth 
                            size="xl" 
                            onClick={(e) => onAction('skip', e.clientX, e.clientY)}
                        >
                            {t.skip}
                        </Button>
                        <Button 
                            themeClass={currentTheme.button} 
                            fullWidth 
                            size="xl" 
                            onClick={(e) => onAction('correct', e.clientX, e.clientY)}
                        >
                            {t.correct}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 opacity-40">
                    <AlertCircle size={64} className="mx-auto" />
                    <p className={`text-xl font-serif ${currentTheme.textMain}`}>{t.youGuess}</p>
                    <p className={`text-[10px] uppercase tracking-widest font-bold ${currentTheme.textSecondary}`}>{t.sayAloud}</p>
                </div>
            )}
        </main>
      </div>
  );
};

export const RoundSummaryScreen = () => {
    const { setGameState, currentTheme, teams, currentTeamIndex, setTeams, currentRoundStats, settings, playSound, isHost } = useGame();
    const t = TRANSLATIONS[settings.language];
    const [milestone, setMilestone] = useState<{points: number, team: string} | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const processingRef = useRef(false);
    
    const points = currentRoundStats.correct - (settings.skipPenalty ? currentRoundStats.skipped : 0);
    const activeTeam = teams[currentTeamIndex]; 
    const scoringTeam = teams.find(t => t.id === currentRoundStats.teamId) || activeTeam;

    /**
     * 2.5 ВИПРАВЛЕНО: processingRef запобігає повторним викликам
     */
    const confirmRoundResults = () => {
        if (!isHost || isSubmitting || processingRef.current) return;
        processingRef.current = true;
        setIsSubmitting(true);

        const updatedTeams = teams.map(t => {
            if (t.id === currentRoundStats.teamId) return { ...t, score: Math.max(0, t.score + points) };
            return t;
        }).map(t => {
            if (t.id === activeTeam.id) return { ...t, nextPlayerIndex: (t.nextPlayerIndex + 1) % (t.players.length || 1) };
            return t;
        });

        const oldScore = scoringTeam.score, newScore = Math.max(0, oldScore + points);
        const oldTens = Math.floor(oldScore / 10), newTens = Math.floor(newScore / 10);
        
        let delay = 0;
        if (newTens > oldTens && newScore < settings.scoreToWin) {
            setMilestone({ points: newTens * 10, team: scoringTeam.name });
            if (settings.soundEnabled) playSound('win'); 
            delay = 3000;
        }
        
        setTeams(updatedTeams);
        setTimeout(() => {
            if (currentTeamIndex === teams.length - 1 && updatedTeams.some(t => t.score >= settings.scoreToWin)) {
              setGameState(GameState.GAME_OVER);
            } else {
              setGameState(GameState.SCOREBOARD);
            }
            processingRef.current = false; // Reset!
        }, delay);
    };

    return (
      <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 relative`}>
        {milestone && <MilestoneNotification points={milestone.points} teamName={milestone.team} onComplete={() => setMilestone(null)} />}
        {points > 0 && <Confetti />}
        
        <header className="py-12 text-center space-y-4">
            <h2 className={`text-4xl font-serif tracking-widest uppercase ${currentTheme.textMain}`}>{t.timeIsUp}</h2>
            <div className={`inline-block px-6 py-2 rounded-full border border-white/10 bg-white/5`}>
                <span className={`text-[10px] font-sans font-bold uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}>
                    {t.playedTeam.replace('{0}', scoringTeam.name)}
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

// Scoreboard Screen: Rankings
export const ScoreboardScreen = () => {
  const { teams, currentTheme, settings, handleNextRound, isHost } = useGame();
  const t = TRANSLATIONS[settings.language];
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8`}>
      <header className="py-12 text-center">
        <h2 className={`text-4xl font-serif tracking-widest uppercase ${currentTheme.textMain}`}>{t.scoreboard}</h2>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
        {sortedTeams.map((team, idx) => (
          <div key={team.id} className={`p-6 rounded-3xl border ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'} flex items-center justify-between`}>
            <div className="flex items-center gap-6">
                <span className={`text-2xl font-serif opacity-20 ${currentTheme.textMain}`}>{idx + 1}</span>
                <div className="space-y-1">
                    <h3 className={`font-serif text-xl ${currentTheme.textMain}`}>{team.name}</h3>
                    <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>
                        {team.players.length} {t.playersCount}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <span className={`text-3xl font-serif font-bold ${currentTheme.textAccent}`}>{team.score}</span>
            </div>
          </div>
        ))}
      </div>

      <footer className="py-8">
        {isHost ? (
            <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={handleNextRound}>
                {t.nextRound}
            </Button>
        ) : (
            <p className="text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse">{t.waitAdmin}</p>
        )}
      </footer>
    </div>
  );
};

// GameOver Screen: Winners
export const GameOverScreen = () => {
  const { teams, currentTheme, settings, resetGame, rematch, isHost } = useGame();
  const t = TRANSLATIONS[settings.language];
  const winners = [...teams].sort((a, b) => b.score - a.score);
  const winner = winners[0];

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 items-center justify-center text-center`}>
      <Confetti />
      <div className="space-y-12 animate-slide-up">
        <Trophy size={80} className="text-yellow-500 mx-auto animate-bounce" />
        
        <div className="space-y-4">
            <h2 className={`text-5xl font-serif ${currentTheme.textMain}`}>{winner.name}</h2>
            <p className={`text-[10px] font-sans font-bold uppercase tracking-[0.5em] text-yellow-500`}>{t.winners}</p>
        </div>

        <div className="space-y-4 pt-12">
            {isHost ? (
              <>
                <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={rematch}>
                    {t.rematch}
                </Button>
                <button onClick={resetGame} className={`w-full py-4 text-[10px] uppercase tracking-[0.4em] font-bold opacity-30 hover:opacity-100 transition-opacity ${currentTheme.textMain}`}>
                    {t.playAgain}
                </button>
              </>
            ) : (
              <p className="text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse">{t.waitAdmin}</p>
            )}
        </div>
      </div>
    </div>
  );
};
