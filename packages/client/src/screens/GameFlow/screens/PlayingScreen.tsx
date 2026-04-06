import React, { useEffect, useRef, useState } from 'react';
import { FloatingParticle } from '../../../components/Shared';
import { GameState, GameMode } from '../../../types';
import { useGame } from '../../../context/GameContext';
import { TRANSLATIONS } from '../../../constants';
import { usePlayerStats } from '../../../hooks/usePlayerStats';
import { HAPTIC } from '../../../utils/haptics';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import { ClassicWordCard, ClassicActionFooter, QuizUI } from '../modes';
import { GuesserFeedback } from './GuesserFeedback';
import { PlayingPauseOverlay } from './PlayingPauseOverlay';

export const PlayingScreen = () => {
  const {
    currentTheme,
    teams,
    currentTeamIndex,
    playSound,
    timeLeft,
    setTimeLeft,
    settings,
    currentWord,
    currentTask,
    handleCorrect,
    handleSkip,
    isHost,
    myPlayerId,
    gameState,
    currentRoundStats,
    isPaused,
    timeUp,
    togglePause,
    gameMode,
    sendAction,
  } = useGame();
  const haptic = useHapticFeedback();
  const t = TRANSLATIONS[settings.general.language];
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; text: string; color: string }[]
  >([]);
  const actionProcessingRef = useRef(false);
  const playerStats = usePlayerStats();
  useEffect(() => {
    return () => {
      void playerStats.flush();
    };
  }, [playerStats]);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const activeTeam = teams[currentTeamIndex];
  const modeSetting = settings.mode.gameMode ?? GameMode.CLASSIC;
  const isQuizMode = modeSetting === GameMode.QUIZ;
  const roundTime = 'classicRoundTime' in settings.mode ? settings.mode.classicRoundTime : 0;

  const playerIdx =
    activeTeam && activeTeam.players.length > 0
      ? Math.min(activeTeam.nextPlayerIndex, activeTeam.players.length - 1)
      : 0;
  const explainer = activeTeam?.players[playerIdx] ?? activeTeam?.players?.[0];
  const isActualExplainer = explainer?.id === myPlayerId;
  const canSeeClassicWord = gameMode === 'OFFLINE' || isActualExplainer;
  const canUseClassicButtons = gameMode === 'OFFLINE' || isActualExplainer;
  const displayPrompt = currentTask?.prompt ?? currentWord;
  const isCriticalTime = timeLeft <= 10;
  const isUrgentTime = timeLeft <= 5;
  const [wordExit, setWordExit] = useState<null | 'left' | 'right'>(null);
  const timeUpVibratedRef = useRef(false);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Both host and client run local timer for smooth display
  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused) return;
    const interval = window.setInterval(
      () => setTimeLeft((prev: number) => Math.max(0, prev - 1)),
      1000
    );
    return () => clearInterval(interval);
  }, [gameState, isPaused, setTimeLeft]);

  useEffect(() => {
    if (timeUp && isActualExplainer && !timeUpVibratedRef.current) {
      haptic(HAPTIC.timeUp);
      timeUpVibratedRef.current = true;
    }
    if (!timeUp) timeUpVibratedRef.current = false;
  }, [timeUp, isActualExplainer, haptic]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused) return;
    if (timeLeft <= 10 && timeLeft > 0 && settings.general.soundEnabled) playSound('tick');
  }, [timeLeft, gameState, isPaused, settings.general.soundEnabled, playSound]);

  if (!activeTeam || activeTeam.players.length === 0) {
    return null;
  }

  const onAction = (type: 'correct' | 'skip', x: number, y: number) => {
    if (isPaused || actionProcessingRef.current) return;
    actionProcessingRef.current = true;

    const teamColor =
      activeTeam && typeof (activeTeam as any).colorHex === 'string' && (activeTeam as any).colorHex
        ? (activeTeam as any).colorHex
        : type === 'correct'
          ? 'var(--ui-success)'
          : 'var(--ui-danger)';

    setWordExit(type === 'correct' ? 'right' : 'left');
    if (type === 'correct') haptic(HAPTIC.correct);
    else haptic(HAPTIC.skip);

    window.setTimeout(() => {
      if (type === 'correct') {
        playerStats.increment('wordsGuessed');
        handleCorrect();
        setParticles((prev) => [...prev, { id: Date.now(), x, y, text: '+1', color: teamColor }]);
      } else {
        playerStats.increment('wordsSkipped');
        handleSkip();
        setParticles((prev) => [
          ...prev,
          {
            id: Date.now(),
            x,
            y,
            text: settings.general.skipPenalty ? '-1' : '0',
            color: teamColor,
          },
        ]);
      }
      setWordExit(null);
    }, 120);

    const ACTION_DEBOUNCE_MS = 300;
    setTimeout(() => {
      actionProcessingRef.current = false;
    }, ACTION_DEBOUNCE_MS);
  };

  const pctLeft = roundTime > 0 ? timeLeft / roundTime : 0;
  const dangerBar = pctLeft <= 0.2;

  return (
    <div
      className={`flex flex-col min-h-screen ${currentTheme.bg} ${currentTheme.textMain} font-sans antialiased h-screen w-full overflow-hidden relative transition-colors`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {particles.map((p) => (
        <FloatingParticle
          key={p.id}
          {...p}
          onComplete={() => setParticles((prev) => prev.filter((x) => x.id !== p.id))}
        />
      ))}

      {isPaused && (
        <PlayingPauseOverlay
          currentTheme={currentTheme}
          t={{ paused: t.paused, tapResume: t.tapResume }}
        />
      )}

      {/* Progress Bar Header */}
      <header
        className="w-full px-6 pb-2 flex flex-col gap-5 z-20"
        style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
      >
        {timeUp && canUseClassicButtons && !isQuizMode && (
          <p className="text-center text-(--ui-accent) text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">
            {t.finishWord}
          </p>
        )}
        <div className="w-full h-[5px] bg-(--ui-surface) rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width,background-color,box-shadow] duration-300 ease-linear ${
              dangerBar
                ? 'bg-(--ui-danger) shadow-[0_0_14px_color-mix(in_srgb,var(--ui-danger)_55%,transparent)]'
                : `${currentTheme.progressBar} shadow-[0_0_14px_color-mix(in_srgb,var(--ui-accent)_35%,transparent)]`
            }`}
            style={{ width: `${roundTime > 0 ? (timeLeft / roundTime) * 100 : 0}%` }}
          />
        </div>

        <div className="flex justify-between items-center w-full">
          <div
            className={`text-(--ui-accent) font-sans font-light tracking-widest text-lg w-20 tabular-nums transition-colors ${isCriticalTime ? 'text-(--ui-danger) animate-pulse' : ''} ${isUrgentTime ? 'animate-bounce' : ''}`}
          >
            {formatTime(timeLeft)}
          </div>

          <button
            type="button"
            onClick={() => {
              haptic(HAPTIC.nav);
              togglePause();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-(--ui-surface-hover) transition-colors"
          >
            <span className="material-symbols-outlined text-(--ui-accent) text-2xl">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
          </button>

          <div className="text-text-sub-dark font-sans text-sm tracking-wide w-20 text-right">
            {t.score}:{' '}
            <span className="text-(--ui-fg) font-medium">{currentRoundStats.correct}</span>
          </div>
        </div>
      </header>

      {/* Word Card */}
      <main className="flex-1 flex flex-col items-center justify-center w-full px-8 relative z-10 pb-24">
        {isQuizMode && currentTask ? (
          <QuizUI
            task={currentTask}
            disabled={isPaused}
            currentTheme={currentTheme}
            onAction={sendAction}
          />
        ) : canSeeClassicWord ? (
          <ClassicWordCard
            displayPrompt={displayPrompt}
            isCriticalTime={isCriticalTime}
            wordExit={wordExit}
            currentTheme={currentTheme}
          />
        ) : (
          <GuesserFeedback
            correct={currentRoundStats.correct}
            skipped={currentRoundStats.skipped}
            words={currentRoundStats.words}
            theme={currentTheme}
            t={{
              youGuess: t.youGuess,
              guessed: t.guessed,
              correct: t.correct,
              guesserListenHint: t.guesserListenHint,
              skippedWord: t.skippedWord,
            }}
            teamColorHex={(activeTeam as any)?.colorHex}
          />
        )}
      </main>

      {canUseClassicButtons && !isQuizMode && (
        <ClassicActionFooter
          t={t}
          onCorrect={(e) => onAction('correct', e.clientX, e.clientY)}
          onSkip={(e) => onAction('skip', e.clientX, e.clientY)}
        />
      )}
    </div>
  );
};
