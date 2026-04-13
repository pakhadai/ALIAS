import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FloatingParticle } from '../../../components/Shared';
import { GameState, GameMode } from '../../../types';
import { useGame } from '../../../context/GameContext';
import { useT } from '../../../hooks/useT';
import { usePlayerStats } from '../../../hooks/usePlayerStats';
import { HAPTIC } from '../../../utils/haptics';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';
import { ClassicWordCard, ClassicActionFooter, QuizUI } from '../modes';
import { GuesserFeedback } from './GuesserFeedback';
import { PlayingPauseOverlay } from './PlayingPauseOverlay';

export const PlayingScreen = () => {
  const {
    currentTheme,
    players,
    teams,
    currentTeamIndex,
    playSound,
    timeLeft,
    setTimeLeft,
    roundEndsAt,
    quizTaskLockUntil,
    quizRoundTimeLeft,
    settings,
    currentWord,
    currentTask,
    currentTaskAnswered,
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
  const t = useT();
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
  const isQuizPerTask =
    isQuizMode && 'quizTimerMode' in settings.mode && settings.mode.quizTimerMode === 'PER_TASK';
  const countdownMax = useMemo(() => {
    const m = settings.mode;
    if (m.gameMode === GameMode.QUIZ && 'quizTimerMode' in m) {
      return m.quizTimerMode === 'PER_TASK'
        ? m.quizQuestionTime
        : (m.quizRoundTime ?? m.classicRoundTime);
    }
    return 'classicRoundTime' in m ? m.classicRoundTime : 0;
  }, [settings.mode]);

  const [displayTick, setDisplayTick] = useState(0);
  const displayTimeLeft = useMemo(() => {
    if (gameMode !== 'ONLINE' || !roundEndsAt || gameState !== GameState.PLAYING || isPaused) {
      return timeLeft;
    }
    const now = Date.now();
    if (quizTaskLockUntil != null && quizTaskLockUntil > now && modeSetting === GameMode.QUIZ) {
      return timeLeft;
    }
    return Math.max(0, Math.ceil((roundEndsAt - now) / 1000));
  }, [
    gameMode,
    roundEndsAt,
    timeLeft,
    gameState,
    isPaused,
    displayTick,
    quizTaskLockUntil,
    modeSetting,
  ]);

  const playerIdx =
    activeTeam && activeTeam.players.length > 0
      ? Math.min(activeTeam.nextPlayerIndex, activeTeam.players.length - 1)
      : 0;
  const explainer = activeTeam?.players[playerIdx] ?? activeTeam?.players?.[0];
  const isActualExplainer = explainer?.id === myPlayerId;
  const canSeeClassicWord = gameMode === 'OFFLINE' || isActualExplainer;
  const canUseClassicButtons = gameMode === 'OFFLINE' || isActualExplainer;
  const displayPrompt = currentTask?.prompt ?? currentWord;
  const solvedBy = isQuizMode ? currentTaskAnswered : undefined;
  const solvedByName =
    isQuizMode && solvedBy ? (players.find((p) => p.id === solvedBy)?.name ?? null) : null;
  const prevSolvedByRef = useRef<string | undefined>(undefined);
  const isCriticalTime = displayTimeLeft <= 10;
  const isUrgentTime = displayTimeLeft <= 5;
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

  /** Online: re-render from `roundEndsAt` (server authority). Offline: decrement `timeLeft` locally. */
  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused) return;
    if (gameMode === 'ONLINE' && roundEndsAt) {
      const id = window.setInterval(() => setDisplayTick((n) => n + 1), 200);
      return () => clearInterval(id);
    }
    if (gameMode === 'OFFLINE') {
      const interval = window.setInterval(
        () => setTimeLeft((prev: number) => Math.max(0, prev - 1)),
        1000
      );
      return () => clearInterval(interval);
    }
    return undefined;
  }, [gameState, isPaused, gameMode, roundEndsAt, setTimeLeft]);

  useEffect(() => {
    if (timeUp && isActualExplainer && !timeUpVibratedRef.current) {
      haptic.pattern(HAPTIC.timeUp);
      haptic.notificationOccurred('error');
      timeUpVibratedRef.current = true;
    }
    if (!timeUp) timeUpVibratedRef.current = false;
  }, [timeUp, isActualExplainer, haptic]);

  // QUIZ micro-round audio: play when someone solves the current task (server-confirmed).
  useEffect(() => {
    if (!isQuizMode) return;
    if (!currentTask?.id) return;
    if (!currentTaskAnswered) {
      prevSolvedByRef.current = undefined;
      return;
    }
    if (prevSolvedByRef.current === currentTaskAnswered) return;
    prevSolvedByRef.current = currentTaskAnswered;

    if (currentTaskAnswered === myPlayerId) {
      playSound('win');
    } else {
      playSound('click');
    }
  }, [isQuizMode, currentTask?.id, currentTaskAnswered, myPlayerId, playSound]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused) return;
    if (displayTimeLeft <= 10 && displayTimeLeft > 0 && settings.general.soundEnabled)
      playSound('tick');
  }, [displayTimeLeft, gameState, isPaused, settings.general.soundEnabled, playSound]);

  if (!activeTeam || activeTeam.players.length === 0) {
    return null;
  }

  const onAction = (type: 'correct' | 'skip', x: number, y: number) => {
    if (isPaused || actionProcessingRef.current) return;
    actionProcessingRef.current = true;

    const teamColor = activeTeam.colorHex
      ? activeTeam.colorHex
      : type === 'correct'
        ? 'var(--ui-success)'
        : 'var(--ui-danger)';

    if (type === 'correct') {
      haptic.pattern(HAPTIC.correct);
      haptic.notificationOccurred('success');
      playerStats.increment('wordsGuessed');
      handleCorrect();
      setParticles((prev) => [...prev, { id: Date.now(), x, y, text: '+1', color: teamColor }]);
    } else {
      haptic.pattern(HAPTIC.skip);
      haptic.notificationOccurred('warning');
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

    /** Short guard against double taps without adding perceived input lag. */
    const ACTION_DEBOUNCE_MS = 140;
    window.setTimeout(() => {
      actionProcessingRef.current = false;
    }, ACTION_DEBOUNCE_MS);
  };

  const pctLeft = countdownMax > 0 ? displayTimeLeft / countdownMax : 0;
  const dangerBar = pctLeft <= 0.2;

  return (
    <div
      className={`flex flex-col min-h-screen ${currentTheme.bg} ${currentTheme.textMain} font-sans antialiased h-screen w-full overflow-hidden relative transition-colors pt-env-top pb-env-bottom`}
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
          onResume={togglePause}
        />
      )}

      {/* Progress Bar Header */}
      <header className="w-full px-6 pb-2 pt-safe-top flex flex-col gap-5 z-20">
        {timeUp && canUseClassicButtons && !isQuizMode && (
          <p className="text-center text-ui-accent text-xs font-bold uppercase tracking-wide animate-pulse">
            {t.finishWord}
          </p>
        )}
        <div className="w-full h-[5px] bg-ui-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width,background-color,box-shadow] duration-300 ease-linear ${
              dangerBar
                ? 'bg-ui-danger shadow-[0_0_14px_color-mix(in_srgb,var(--ui-danger)_55%,transparent)]'
                : `${currentTheme.progressBar} shadow-[0_0_14px_color-mix(in_srgb,var(--ui-accent)_35%,transparent)]`
            }`}
            style={{
              width: `${countdownMax > 0 ? (displayTimeLeft / countdownMax) * 100 : 0}%`,
            }}
          />
        </div>

        <div className="flex justify-between items-center w-full">
          <div
            className={`text-ui-accent font-sans font-light tracking-widest text-lg w-20 tabular-nums transition-all duration-200 ${isCriticalTime ? 'text-ui-danger animate-pulse' : ''} ${isUrgentTime ? 'animate-bounce' : ''}`}
          >
            {formatTime(displayTimeLeft)}
          </div>

          <button
            type="button"
            onClick={() => {
              haptic.pattern(HAPTIC.nav);
              haptic.impactOccurred('light');
              togglePause();
            }}
            className="w-11 h-11 min-h-11 min-w-11 flex items-center justify-center rounded-full active:bg-ui-surface-hover transition-all duration-200 active:scale-95"
          >
            <span className="material-symbols-outlined text-ui-accent text-2xl">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
          </button>

          <div className="text-ui-fg-muted font-sans text-sm tracking-wide w-24 text-right flex flex-col gap-0.5 items-end">
            <div>
              {t.score}: <span className="text-ui-fg font-medium">{currentRoundStats.correct}</span>
            </div>
            {isQuizPerTask && quizRoundTimeLeft != null && (
              <div className="text-[11px] uppercase tracking-wide opacity-90 leading-tight">
                <span className="font-bold">{t.quizRoundClock}:</span>{' '}
                <span className="tabular-nums">{formatTime(quizRoundTimeLeft)}</span>
              </div>
            )}
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
            currentTaskAnswered={solvedBy}
            solvedByName={solvedByName}
            onAction={sendAction}
          />
        ) : canSeeClassicWord ? (
          <ClassicWordCard
            displayPrompt={displayPrompt}
            isCriticalTime={isCriticalTime}
            swipeDisabled={isPaused}
            onSwipe={
              canUseClassicButtons
                ? (dir, origin) =>
                    onAction(dir === 'correct' ? 'correct' : 'skip', origin.x, origin.y)
                : undefined
            }
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
            teamColorHex={activeTeam.colorHex}
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
