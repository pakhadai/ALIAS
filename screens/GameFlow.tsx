
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Clock, X, Check, ChevronRight, BarChart2, User, Trophy, RotateCcw, ArrowRight, Star, Pause, Play, RefreshCw, Medal, Info } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Confetti, FloatingParticle, MilestoneNotification } from '../components/Shared';
import { GameState, Player, AppTheme } from '../types';
import { useGame } from '../context/GameContext';
import { TRANSLATIONS } from '../constants';

const GameBoard = () => {
    const { teams, settings } = useGame();
    const t = TRANSLATIONS[settings.language];
    const winningScore = settings.scoreToWin;
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setContainerSize({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);
    const isMobile = containerSize.width < 500 && containerSize.height > containerSize.width;
    const pathData = isMobile ? "M 50 95 Q 10 75 50 50 T 50 5" : "M 5 50 Q 25 10 50 50 T 95 50"; 
    const leaderScore = Math.max(...teams.map(t => t.score));
    const leaderPercent = Math.min(100, (leaderScore / winningScore) * 100);
    const getPosition = (percent: number) => {
        const p = percent / 100;
        if (isMobile) {
            const y = 95 - (p * 90);
            const x = 50 + Math.sin(p * Math.PI * 2) * 30;
            return { x, y };
        } else {
             const x = 5 + (p * 90);
             const y = 50 + Math.sin(p * Math.PI * 2) * 30;
             return { x, y };
        }
    };
    return (
        <div ref={containerRef} className="w-full h-64 md:h-48 relative bg-black/20 rounded-xl overflow-hidden border border-white/5 mb-4 shadow-inner">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="trackGradient" x1="0%" y1="0%" x2={isMobile ? "0%" : "100%"} y2={isMobile ? "100%" : "0%"}>
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.5" />
                    </linearGradient>
                </defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.05)" /></pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <path d={pathData} stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" strokeLinecap="round" />
                <path d={pathData} stroke="url(#trackGradient)" strokeWidth="8" fill="none" strokeLinecap="round" pathLength="100" strokeDasharray={`${leaderPercent} 100`} className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                <text x={isMobile ? 50 : 5} y={isMobile ? 98 : 50} textAnchor="middle" fill="white" fontSize="4" fontWeight="bold" className="opacity-50 font-sans">{t.startBoard}</text>
                <text x={isMobile ? 50 : 95} y={isMobile ? 2 : 50} textAnchor="middle" fill="white" fontSize="4" fontWeight="bold" className="opacity-70 font-sans">{t.finishBoard}</text>
            </svg>
            {teams.map((team, idx) => {
                const percent = Math.min(100, Math.max(0, (team.score / winningScore) * 100));
                const pos = getPosition(percent);
                const isLeader = team.score === leaderScore && team.score > 0;
                return (
                    <div 
                        key={team.id}
                        className={`absolute transition-all duration-1000 ease-in-out z-10 flex flex-col items-center ${isLeader ? 'z-20' : ''}`}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', animation: `float 3s ease-in-out infinite`, animationDelay: `${idx * 0.5}s` }}
                    >
                             <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold text-white relative ${team.color} ${isLeader ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}`}>
                                 {team.name.substring(0, 1)}
                                 <div className={`absolute inset-0 rounded-full blur-sm ${team.color} -z-10 opacity-70`}></div>
                                 {isLeader && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-400 animate-bounce"><Star size={16} fill="currentColor" /></div>}
                             </div>
                             <div className="absolute top-full mt-1 text-[8px] font-bold text-white/90 whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10">{team.score}</div>
                    </div>
                );
            })}
        </div>
    );
};

export const CountdownScreen = () => {
    const { currentTheme, startGameplay, isHost, settings } = useGame();
    const t = TRANSLATIONS[settings.language];
    const [count, setCount] = useState(3);
    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => setCount(count - 1), 1000);
            return () => clearTimeout(timer);
        } else if (isHost) startGameplay();
    }, [count, isHost, startGameplay]);
    return (
        <div className={`flex flex-col items-center justify-center min-h-screen ${currentTheme.bg} p-6 relative overflow-hidden transition-colors duration-500`}>
            <div className="relative z-10 text-center">
                <div className={`text-4xl mb-8 font-black ${currentTheme.textMain} animate-pulse`}>{count > 0 ? t.getReady : t.go}</div>
                {count > 0 && <div className={`text-[12rem] font-black ${currentTheme.textMain} animate-pop-in drop-shadow-2xl`}>{count}</div>}
            </div>
        </div>
    );
};

export const PreRoundScreen = () => {
  const { currentTheme, teams, currentTeamIndex, handleStartRound, isHost, myPlayerId, settings, gameMode } = useGame();
  const t = TRANSLATIONS[settings.language];
  const activeTeam = teams[currentTeamIndex];
  const isOneVsOne = teams.every(t => t.players.length === 1);
  let explainer: Player, guessingTeamName = activeTeam.name;
  if (isOneVsOne) {
      explainer = activeTeam.players[0];
      guessingTeamName = teams[(currentTeamIndex + 1) % teams.length].name;
  } else {
      explainer = activeTeam.players[activeTeam.nextPlayerIndex];
  }
  const isMyTurnToExplain = myPlayerId === explainer.id;
  return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${currentTheme.bg} p-6 text-center space-y-6 relative overflow-hidden transition-colors duration-500`}>
        <div className="relative z-10 w-full max-w-sm">
           <Card themeClass={currentTheme.card} className="mb-6 animate-pop-in">
              <span className={`${currentTheme.textSecondary} uppercase tracking-widest text-xs font-black`}>{t.score}</span>
              <div className="flex justify-between items-center mt-4 px-4">
                 {teams.map(t => (
                   <div key={t.id} className={`text-center transition-all duration-500 ${t.id === activeTeam.id ? 'opacity-100 scale-125' : 'opacity-40 scale-100'}`}>
                      <div className={`w-3 h-3 mx-auto mb-1 rounded-full ${t.color}`}></div>
                      <div className={`font-black text-2xl ${currentTheme.textMain}`}>{t.score}</div>
                   </div>
                 ))}
              </div>
           </Card>
           <div className="space-y-1 mb-10 animate-slide-up delay-100">
             <span className={`${currentTheme.textSecondary} uppercase tracking-widest text-sm font-black`}>{t.playingNow}</span>
             <h1 className={`text-5xl font-black ${currentTheme.textMain}`}>{activeTeam.name}</h1>
             {isOneVsOne && <p className="text-sm text-yellow-500 font-bold bg-black/10 px-3 py-1 rounded-full inline-block mt-2">Points for: {guessingTeamName}</p>}
           </div>
           {gameMode === 'OFFLINE' && <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-2xl mb-8 animate-pulse"><p className="text-yellow-600 font-black text-xs uppercase tracking-widest mb-1">{t.passPhone}</p><div className={`text-3xl font-black ${currentTheme.textMain}`}>{explainer.name}</div></div>}
           <div className="grid grid-cols-1 gap-4 mb-10">
              <Card themeClass={currentTheme.card} className={`p-6 relative overflow-hidden transition-all duration-300 ${isMyTurnToExplain ? 'ring-2 ring-champagne-gold shadow-[0_0_20px_rgba(243,229,171,0.2)]' : ''}`}>
                 <div className="relative z-10"><div className={`text-xs ${currentTheme.textAccent} uppercase font-black tracking-widest mb-4`}>{t.explains} {isMyTurnToExplain ? '(YOU)' : ''}</div><div className={`text-3xl font-black ${currentTheme.textMain} flex flex-col items-center justify-center gap-2`}><span className="text-5xl mb-2 animate-bounce">{explainer.avatar}</span>{explainer.name}</div></div>
              </Card>
           </div>
           {isHost ? <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={handleStartRound}>{t.go}</Button> : <div className={`text-center font-black uppercase tracking-widest text-xs animate-pulse ${currentTheme.textSecondary}`}>{t.waitAdmin}</div>}
        </div>
      </div>
  );
};

export const PlayingScreen = () => {
  const { currentTheme, teams, currentTeamIndex, playSound, timeLeft, setTimeLeft, settings, currentWord, setGameState, handleCorrect, handleSkip, isHost, myPlayerId, gameState, currentRoundStats, isPaused, togglePause, gameMode } = useGame();
  const t = TRANSLATIONS[settings.language];
  const [particles, setParticles] = useState<{ id: number, x: number, y: number, text: string, color: string }[]>([]);
  const actionProcessingRef = useRef(false);
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const activeTeam = teams[currentTeamIndex];
  const explainer = teams.every(t => t.players.length === 1) ? activeTeam.players[0] : activeTeam.players[activeTeam.nextPlayerIndex];
  const isExplainer = gameMode === 'OFFLINE' || explainer.id === myPlayerId;
  const isCriticalTime = timeLeft <= 10;
  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused) return;
    const interval = window.setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [gameState, isPaused, setTimeLeft]); 
  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused) return;
    if (timeLeft <= 6 && timeLeft > 0 && settings.soundEnabled) playSound('tick');
    if (isHost && timeLeft === 0) {
        playSound('end');
        setGameState(GameState.ROUND_SUMMARY);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, [timeLeft, isHost, gameState, isPaused, settings.soundEnabled, playSound, setGameState]);
  const addParticle = useCallback((x: number, y: number, type: 'correct' | 'skip') => {
    setParticles(prev => [...prev, { id: Date.now() + Math.random(), x, y, text: type === 'correct' ? '+1' : (settings.skipPenalty ? '-1' : '0'), color: type === 'correct' ? '#10b981' : '#ef4444' }]);
  }, [settings.skipPenalty]);
  const removeParticle = useCallback((id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);
  const onAction = (type: 'correct' | 'skip', x: number, y: number) => {
      if (isPaused || actionProcessingRef.current) return;
      actionProcessingRef.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      addParticle(x, y, type);
      if (type === 'correct') handleCorrect();
      else handleSkip();
      setTimeout(() => { actionProcessingRef.current = false; }, 250);
  };
  const handleTouchStart = (e: React.TouchEvent) => {
      if (!isExplainer || isPaused) return;
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
      if (!isExplainer || !touchStartRef.current || isPaused) return;
      setSwipeOffset(e.touches[0].clientX - touchStartRef.current.x);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!isExplainer || !touchStartRef.current || isPaused) return;
      if (swipeOffset > 100) onAction('correct', e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      else if (swipeOffset < -100) onAction('skip', e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      setSwipeOffset(0);
      touchStartRef.current = null;
  };
  return (
      <div className={`flex flex-col min-h-screen ${currentTheme.bg} relative overflow-hidden transition-colors`}>
        {particles.map(p => <FloatingParticle key={p.id} x={p.x} y={p.y} text={p.text} color={p.color} onComplete={() => removeParticle(p.id)} />)}
        {isPaused && <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in"><div className="text-center"><Pause size={64} className="text-white mx-auto mb-4" /><h2 className="text-3xl font-black text-white mb-2">{t.paused}</h2>{isHost && <Button onClick={togglePause} variant="success">{t.resume}</Button>}</div></div>}
        <div className="h-3 bg-black/30 w-full"><div className={`h-full transition-all duration-1000 ease-linear ${isCriticalTime ? 'bg-red-500' : currentTheme.progressBar}`} style={{ width: `${(timeLeft / settings.roundTime) * 100}%` }} /></div>
        <div className="flex justify-between items-center p-6">
           <div className={`flex items-center space-x-3 bg-black/20 px-4 py-2 rounded-full border border-white/10 ${isCriticalTime ? 'animate-shake border-red-500/50' : ''}`}><Clock size={20} className={isCriticalTime ? 'text-red-400' : currentTheme.iconColor} /><span className={`font-mono font-black text-2xl ${isCriticalTime ? 'text-red-400' : 'text-white'}`}>{timeLeft}</span></div>
           <div className="flex items-center gap-3">
             {isHost && <button onClick={togglePause} className={`p-3 rounded-full transition-colors ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>{isPaused ? <Play size={20} className="text-emerald-500" /> : <Pause size={20} className={currentTheme.iconColor} />}</button>}
             <div className="bg-black/20 text-white px-4 py-2 rounded-full border border-white/10 font-black text-xl">{currentRoundStats.correct}</div>
           </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 relative">
          <div className="w-full max-w-sm aspect-[4/5] relative">
            {!isExplainer ? <div className="text-center h-full flex flex-col items-center justify-center p-6 bg-black/10 rounded-3xl border border-white/5"><h2 className={`text-4xl font-black mb-4 ${currentTheme.textMain}`}>{t.listenTo.replace('{0}', explainer.name)}</h2><p className={`font-black uppercase tracking-widest text-xs opacity-60 ${currentTheme.textSecondary}`}>{t.youGuess}</p></div> : 
              <div key={currentWord} className={`absolute inset-0 ${settings.theme === AppTheme.PREMIUM_LIGHT ? 'bg-white text-slate-900 border-slate-200 shadow-xl' : 'bg-premium-white text-premium-dark-bg shadow-2xl'} rounded-3xl flex flex-col items-center justify-center p-10 touch-none border-2`} style={{ transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.05}deg)`, transition: swipeOffset === 0 ? 'transform 0.3s ease-out' : 'none' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                <h2 className="text-6xl font-black text-center break-words leading-tight font-serif">{currentWord}</h2>
                <div className="mt-12 flex gap-12 opacity-20">
                    <X size={40} /><Check size={40} />
                </div>
              </div>
            }
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 p-8 safe-area-bottom">
           {isExplainer && <>
               <button onClick={(e) => onAction('skip', e.clientX, e.clientY)} className={`p-8 rounded-3xl flex flex-col items-center shadow-lg active:scale-95 transition-all ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-dark-btn-grey hover:bg-dark-btn-hover' : 'bg-slate-200 hover:bg-slate-300'}`}><X size={44} className="text-red-500 mb-2" /><span className={`font-black uppercase tracking-widest text-xs ${currentTheme.textSecondary}`}>{t.skip}</span></button>
               <button onClick={(e) => onAction('correct', e.clientX, e.clientY)} className="p-8 bg-emerald-500 hover:bg-emerald-600 rounded-3xl flex flex-col items-center shadow-lg active:scale-95 transition-all"><Check size={44} className="text-white mb-2" /><span className="font-black uppercase tracking-widest text-xs text-white">{t.correct}</span></button>
           </>}
        </div>
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
    const confirmRoundResults = () => {
        if (!isHost || isSubmitting || processingRef.current) return;
        setIsSubmitting(true);
        processingRef.current = true;
        const updatedTeams = teams.map(t => {
            if (t.id === currentRoundStats.teamId) return { ...t, score: Math.max(0, t.score + points) };
            return t;
        }).map(t => {
            if (t.id === activeTeam.id) return { ...t, nextPlayerIndex: (t.nextPlayerIndex + 1) % (t.players.length || 1) };
            return t;
        });
        const oldScore = scoringTeam.score, newScore = Math.max(0, oldScore + points);
        const oldTens = Math.floor(oldScore / 10), newTens = Math.floor(newScore / 10);
        if (newTens > oldTens && newScore < settings.scoreToWin) {
            setMilestone({ points: newTens * 10, team: scoringTeam.name });
            if (settings.soundEnabled) playSound('win'); 
        }
        setTeams(updatedTeams);
        setTimeout(() => {
            if (currentTeamIndex === teams.length - 1 && updatedTeams.some(t => t.score >= settings.scoreToWin)) {
              playSound('win');
              setGameState(GameState.GAME_OVER);
            } else setGameState(GameState.SCOREBOARD);
        }, newTens > oldTens && newScore < settings.scoreToWin ? 3000 : 0);
    };
    return (
      <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 relative`}>
        {milestone && <MilestoneNotification points={milestone.points} teamName={milestone.team} onComplete={() => setMilestone(null)} />}
        {points > 0 && <Confetti />}
        <header className="py-8 text-center"><h2 className={`text-xl font-black uppercase tracking-[0.3em] ${currentTheme.textSecondary}`}>{t.roundPoints}</h2></header>
        <Card themeClass={currentTheme.card} className="flex flex-col items-center py-12 mb-8 mt-4"><div className={`text-8xl font-black ${points >= 0 ? 'text-emerald-500' : 'text-red-500'} font-serif`}>{points > 0 ? `+${points}` : points}</div></Card>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-8">
           <h3 className={`text-xs font-black uppercase tracking-widest ${currentTheme.textSecondary} mb-4`}>{currentRoundStats.skipped > 0 ? t.skippedWordsTitle : ''}</h3>
           {currentRoundStats.words.filter(w => w.result === 'skipped').map((item, idx) => (
             <div key={idx} className={`flex justify-between items-center p-4 ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5' : 'bg-slate-100'} rounded-2xl border border-black/5`}>
               <span className={`font-bold ${currentTheme.textMain}`}>{item.word}</span>
               <X size={18} className="text-red-500 opacity-50" />
             </div>
           ))}
           {currentRoundStats.skipped === 0 && <div className="text-center py-10 opacity-30"><p className={`text-sm italic ${currentTheme.textSecondary}`}>{t.noSkips}</p></div>}
        </div>
        <div className="safe-area-bottom">
           {isHost ? <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={confirmRoundResults} disabled={!!milestone || isSubmitting}>{t.continue}</Button> : <div className={`text-center font-black uppercase tracking-widest text-xs animate-pulse ${currentTheme.textSecondary}`}>{t.waitAdmin}</div>}
        </div>
      </div>
    );
};

export const ScoreboardScreen = () => {
    const { currentTheme, teams, currentTeamIndex, settings, handleNextRound, isHost } = useGame();
    const t = TRANSLATIONS[settings.language];
    return (
      <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-6 transition-colors`}>
         <header className="py-8 text-center"><h2 className={`text-xl font-black uppercase tracking-[0.3em] ${currentTheme.textSecondary}`}>{t.scoreboard}</h2></header>
         <GameBoard />
         <div className="flex-1 space-y-3 overflow-y-auto mt-6 no-scrollbar">
           {[...teams].sort((a,b) => b.score - a.score).map((team, rank) => (
               <Card key={team.id} themeClass={currentTheme.card} className={`p-5 border-2 transition-all duration-300 ${team.id === teams[currentTeamIndex].id ? 'border-champagne-gold' : 'border-black/5'}`}>
                 <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-full font-black flex items-center justify-center ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/10 text-white' : 'bg-slate-900 text-white shadow-md'}`}>{rank+1}</div>
                       <div className={`font-black text-lg ${currentTheme.textMain}`}>{team.name}</div>
                    </div>
                    <div className={`text-3xl font-black ${currentTheme.textMain} font-serif`}>{team.score}</div>
                 </div>
                 <div className={`h-2 ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-black/40' : 'bg-slate-200'} rounded-full overflow-hidden`}><div className={`h-full ${team.color} transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.2)]`} style={{ width: `${Math.min(100, (team.score/settings.scoreToWin)*100)}%` }}></div></div>
               </Card>
           ))}
         </div>
         <div className="p-4 safe-area-bottom">
           {isHost ? <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={handleNextRound}>{t.nextRound}</Button> : <div className={`text-center font-black uppercase tracking-widest text-xs animate-pulse ${currentTheme.textSecondary} mt-4`}>{t.waitAdmin}</div>}
         </div>
      </div>
    );
};

export const GameOverScreen = () => {
  const { currentTheme, teams, resetGame, rematch, isHost, settings } = useGame();
  const t = TRANSLATIONS[settings.language];
  const winner = [...teams].sort((a,b) => b.score - a.score)[0];
  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} items-center justify-center p-8 text-center`}>
      <Confetti />
      <div className="animate-pop-in space-y-4 mb-12">
        <div className="relative inline-block">
          <Trophy size={96} className="text-champagne-gold mb-6 animate-bounce" />
          <div className="absolute inset-0 bg-champagne-gold blur-[60px] opacity-20 -z-10"></div>
        </div>
        <h2 className={`text-xl font-black uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}>{t.winners}</h2>
        <h1 className={`text-6xl font-black font-serif ${currentTheme.textMain}`}>{winner.name}</h1>
        <div className="text-5xl font-black text-champagne-gold mt-4 font-serif">{winner.score} <span className="text-lg uppercase tracking-widest ml-1">{t.points}</span></div>
      </div>
      <div className="w-full max-w-sm space-y-4 safe-area-bottom">
        {isHost ? (
          <>
            <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={rematch}>{t.rematch}</Button>
            <Button variant="outline" fullWidth size="lg" onClick={resetGame} className={settings.theme === AppTheme.PREMIUM_LIGHT ? 'text-slate-900 border-slate-300' : ''}>{t.playAgain}</Button>
          </>
        ) : (
          <div className={`text-center font-black uppercase tracking-widest text-xs animate-pulse ${currentTheme.textSecondary}`}>{t.waitAdmin}</div>
        )}
      </div>
    </div>
  );
};
