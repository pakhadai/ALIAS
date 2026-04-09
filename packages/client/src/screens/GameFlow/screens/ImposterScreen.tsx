import { useEffect, useMemo, useRef, useState } from 'react';
import { Ghost, Pause, Play } from 'lucide-react';
import { useGame } from '../../../context/GameContext';
import { Button } from '../../../components/Button';
import { vibrate } from '../../../utils/haptics';
import type { Player } from '../../../types';

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

const IMPOSTER_REVEAL_VIBRATE = [120, 60, 120, 60, 180] as const;

type MiniHeaderProps = {
  readyCount: number;
  total: number;
  showReadyRatio: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  imposterDrama?: boolean;
};

function ImposterMiniHeader({
  readyCount,
  total,
  showReadyRatio,
  isPaused,
  onTogglePause,
  imposterDrama,
}: MiniHeaderProps) {
  return (
    <header
      className={[
        'flex shrink-0 items-center justify-between gap-3 px-4 py-2',
        imposterDrama
          ? 'border-b border-white/10 bg-black/25 text-white'
          : 'border-b border-(--ui-border) bg-(--ui-surface)/80 backdrop-blur-sm',
      ].join(' ')}
    >
      {showReadyRatio ? (
        <span
          className={[
            'tabular-nums text-sm font-semibold',
            imposterDrama ? 'text-white/90' : 'text-(--ui-fg) opacity-80',
          ].join(' ')}
          aria-label={`Готові гравці: ${readyCount} з ${total}`}
        >
          {readyCount}/{total}
        </span>
      ) : (
        <span className="flex-1" aria-hidden />
      )}
      <button
        type="button"
        onClick={onTogglePause}
        className={[
          'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          imposterDrama
            ? 'text-white/90 hover:bg-white/10 active:bg-white/15'
            : 'text-(--ui-fg) hover:bg-(--ui-surface-hover) active:scale-95',
        ].join(' ')}
        aria-label={isPaused ? 'Продовжити' : 'Пауза'}
      >
        {isPaused ? (
          <Play className="h-5 w-5" strokeWidth={2} />
        ) : (
          <Pause className="h-5 w-5" strokeWidth={2} />
        )}
      </button>
    </header>
  );
}

type RevealPhaseProps = {
  isOffline: boolean;
  players: Player[];
  activeRevealPlayer: Player | undefined;
  revealedPlayerIds: string[];
  revealIsImposter: boolean;
  secretWord: string | null | undefined;
  isPaused: boolean;
  togglePause: () => void;
  sendAction: (payload: { action: 'IMPOSTER_READY' }) => void;
  imposterPhase: string | undefined;
};

function ImposterRevealPhase({
  isOffline,
  activeRevealPlayer,
  revealedPlayerIds,
  players,
  revealIsImposter,
  secretWord,
  isPaused,
  togglePause,
  sendAction,
  imposterPhase,
}: RevealPhaseProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [handoffConfirmed, setHandoffConfirmed] = useState(false);

  useEffect(() => {
    setIsFlipped(false);
    setHandoffConfirmed(false);
  }, [imposterPhase, activeRevealPlayer?.id]);

  useEffect(() => {
    if (!isFlipped || !revealIsImposter) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    vibrate([...IMPOSTER_REVEAL_VIBRATE]);
  }, [isFlipped, revealIsImposter]);

  const canReveal = !!activeRevealPlayer;
  const readyDisabled = !isFlipped || !canReveal;
  const readyCount = Math.min(revealedPlayerIds.length, players.length);
  const showHandoff = isOffline && !handoffConfirmed;
  const imposterDrama = isFlipped && revealIsImposter;
  const name = activeRevealPlayer?.name ?? '—';

  const cardShell = [
    'flex w-full max-w-lg flex-col items-center justify-center rounded-3xl border p-8 text-center transition-all duration-200 ease-out',
    'min-h-[min(60vh,28rem)] max-h-[70vh]',
    !canReveal ? 'opacity-60' : '',
  ].join(' ');

  return (
    <div
      className={[
        'animate-page-in flex min-h-dvh flex-col',
        imposterDrama
          ? 'bg-linear-to-b from-[#3a0a12] via-[#1f0508] to-[#0a0204] text-white'
          : 'bg-(--ui-bg)',
      ].join(' ')}
    >
      <ImposterMiniHeader
        readyCount={readyCount}
        total={players.length}
        showReadyRatio
        isPaused={isPaused}
        onTogglePause={togglePause}
        imposterDrama={imposterDrama}
      />

      <div className="flex flex-1 flex-col px-4 py-6">
        {showHandoff ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
            <p className="max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Передай телефон{' '}
              <span className={imposterDrama ? 'text-red-300' : 'text-(--ui-accent)'}>{name}</span>
            </p>
            <Button
              className="w-full max-w-md py-4 text-lg font-semibold"
              disabled={!canReveal}
              onClick={() => setHandoffConfirmed(true)}
            >
              Я — {name}, показати мою картку
            </Button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6">
            <button
              type="button"
              disabled={!canReveal}
              onClick={() => setIsFlipped(true)}
              className={[
                cardShell,
                'will-change-transform active:scale-[0.98]',
                !isFlipped
                  ? imposterDrama
                    ? 'border-white/20 bg-white/5 hover:bg-white/10'
                    : 'border-(--ui-border) bg-(--ui-surface) hover:bg-(--ui-surface-hover)'
                  : revealIsImposter
                    ? 'border-red-500/40 bg-linear-to-br from-red-950/90 to-black/90 shadow-[0_0_60px_-12px_rgba(220,38,38,0.55)]'
                    : 'border-(--ui-border) bg-(--ui-card)',
              ].join(' ')}
              style={
                isFlipped && !revealIsImposter
                  ? {
                      boxShadow:
                        '0 24px 70px -40px color-mix(in_srgb,var(--ui-accent)_38%,transparent)',
                    }
                  : undefined
              }
            >
              {!isFlipped ? (
                <div className="space-y-3">
                  <div className="text-2xl font-semibold sm:text-3xl">Натисни, щоб перевернути</div>
                  <div className={imposterDrama ? 'text-sm text-white/70' : 'text-sm opacity-70'}>
                    Не показуй іншим
                  </div>
                </div>
              ) : revealIsImposter ? (
                <div className="flex flex-col items-center gap-5 animate-reveal-in">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-600/30 text-red-200 ring-2 ring-red-500/50">
                    <Ghost className="h-11 w-11" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="text-4xl font-black uppercase tracking-tight text-red-100 sm:text-5xl">
                    Ти — імпостер
                  </div>
                  <div className="max-w-xs text-base text-red-200/85">Спробуй не видати себе</div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 animate-reveal-in px-2">
                  <div className="text-sm font-medium opacity-70">Секретне слово</div>
                  <div className="text-5xl font-black leading-none sm:text-6xl md:text-7xl">
                    {secretWord ?? '...'}
                  </div>
                </div>
              )}
            </button>

            <Button
              className="w-full shrink-0"
              disabled={readyDisabled}
              onClick={() => sendAction({ action: 'IMPOSTER_READY' })}
            >
              Я подивився / Готовий
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

type DiscussionPhaseProps = {
  timeLeft: number;
  isPaused: boolean;
  togglePause: () => void;
  sendAction: (payload: { action: 'IMPOSTER_END_GAME' }) => void;
};

function ImposterDiscussionPhase({
  timeLeft,
  isPaused,
  togglePause,
  sendAction,
}: DiscussionPhaseProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const urgent = timeLeft <= 10 && timeLeft > 0;

  useEffect(() => {
    if (confirmEnd) {
      window.setTimeout(() => {
        document.getElementById('imposter-end-cancel')?.focus();
      }, 0);
    }
  }, [confirmEnd]);

  return (
    <div className="animate-page-in flex min-h-dvh flex-col bg-(--ui-bg)">
      <ImposterMiniHeader
        readyCount={0}
        total={0}
        showReadyRatio={false}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />

      <div className="flex flex-1 flex-col px-4 pb-8 pt-4">
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="mb-4 text-sm font-medium opacity-60">Обговорення</p>
          <div
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Залишилось часу: ${formatTime(timeLeft)}`}
            className={[
              'font-black tabular-nums tracking-tight',
              'text-[clamp(4rem,18vw,9rem)] leading-none',
              urgent
                ? 'motion-reduce:animate-none animate-pulse text-(--ui-danger)'
                : 'text-(--ui-fg)',
            ].join(' ')}
          >
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="mt-auto space-y-3 pt-6">
          {confirmEnd ? (
            <div
              className="rounded-2xl border border-(--ui-border) bg-(--ui-surface) p-4 text-center"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="imposter-end-confirm-title"
            >
              <p id="imposter-end-confirm-title" className="text-sm font-medium">
                Дійсно завершити гру зараз?
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  id="imposter-end-cancel"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setConfirmEnd(false)}
                >
                  Скасувати
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setConfirmEnd(false);
                    sendAction({ action: 'IMPOSTER_END_GAME' });
                  }}
                >
                  Так, завершити
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              className="w-full rounded-xl py-3 text-center text-sm font-medium text-(--ui-fg-muted) opacity-70 transition-opacity hover:opacity-100"
            >
              Завершити гру / відгадали
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type ResultsPhaseProps = {
  players: Player[];
  imposterPlayerId: string | undefined;
  secretWord: string | null | undefined;
  sendAction: (payload: { action: 'RESET_GAME' | 'REMATCH' }) => void;
};

function ImposterResultsPhase({
  players,
  imposterPlayerId,
  secretWord,
  sendAction,
}: ResultsPhaseProps) {
  const imposter = players.find((p) => p.id === imposterPlayerId);
  const title = imposter ? 'Імпостер викритий!' : 'Результати раунду';

  return (
    <div className="animate-page-in px-4 py-8">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-(--ui-danger) bg-[color-mix(in_srgb,var(--ui-danger)_14%,transparent)] text-6xl shadow-lg"
            aria-hidden
          >
            {imposter?.avatar ?? '?'}
          </div>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
            <p className="mt-2 text-xl font-semibold text-(--ui-accent)">
              {imposter ? imposter.name : 'Дані гравця недоступні'}
            </p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-(--ui-border) bg-(--ui-surface) px-6 py-4">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-60">
            Секретне слово
          </div>
          <div className="mt-2 text-2xl font-extrabold sm:text-3xl">{secretWord ?? '...'}</div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <Button variant="ghost" onClick={() => sendAction({ action: 'RESET_GAME' })}>
            Повернутися в лоббі
          </Button>
          <Button onClick={() => sendAction({ action: 'REMATCH' })}>Грати ще раз</Button>
        </div>
      </div>
    </div>
  );
}

function ImposterLoadingFallback() {
  return (
    <div className="animate-page-in px-4 py-6">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-(--ui-border) bg-(--ui-surface) p-4">
        <div className="text-sm opacity-70">Імпостер</div>
        <div className="mt-2 text-lg font-semibold">Завантаження…</div>
      </div>
    </div>
  );
}

export function ImposterScreen() {
  const {
    gameMode,
    myPlayerId,
    players,
    imposterPhase,
    imposterPlayerId,
    revealedPlayerIds,
    imposterSecret,
    imposterOfflineRevealIndex,
    imposterWord,
    timeLeft,
    isPaused,
    sendAction,
    setTimeLeft,
    togglePause,
  } = useGame();

  const isOffline = gameMode === 'OFFLINE';
  const activeRevealPlayer = useMemo(
    () =>
      isOffline ? players[imposterOfflineRevealIndex] : players.find((p) => p.id === myPlayerId),
    [isOffline, players, imposterOfflineRevealIndex, myPlayerId]
  );

  const revealIsImposter = isOffline
    ? !!activeRevealPlayer?.id && activeRevealPlayer.id === imposterPlayerId
    : !!imposterSecret?.isImposter;

  const secretWord = isOffline ? imposterWord : imposterSecret?.word;

  useEffect(() => {
    if (imposterPhase !== 'DISCUSSION') return;
    if (isPaused) return;
    if (timeLeft <= 0) return;
    const t = window.setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, (typeof prev === 'number' ? prev : 0) - 1));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [imposterPhase, isPaused, timeLeft, setTimeLeft]);

  const discussionAutoEndSent = useRef(false);
  useEffect(() => {
    if (imposterPhase !== 'DISCUSSION') {
      discussionAutoEndSent.current = false;
      return;
    }
    if (timeLeft > 0) return;
    if (!isOffline) return;
    if (discussionAutoEndSent.current) return;
    discussionAutoEndSent.current = true;
    sendAction({ action: 'IMPOSTER_END_GAME' });
  }, [imposterPhase, timeLeft, isOffline, sendAction]);

  if (imposterPhase === 'REVEAL') {
    return (
      <ImposterRevealPhase
        isOffline={isOffline}
        players={players}
        activeRevealPlayer={activeRevealPlayer}
        revealedPlayerIds={revealedPlayerIds}
        revealIsImposter={revealIsImposter}
        secretWord={secretWord}
        isPaused={isPaused}
        togglePause={togglePause}
        sendAction={sendAction}
        imposterPhase={imposterPhase}
      />
    );
  }

  if (imposterPhase === 'DISCUSSION') {
    return (
      <ImposterDiscussionPhase
        timeLeft={timeLeft}
        isPaused={isPaused}
        togglePause={togglePause}
        sendAction={sendAction}
      />
    );
  }

  if (imposterPhase === 'RESULTS') {
    return (
      <ImposterResultsPhase
        players={players}
        imposterPlayerId={imposterPlayerId}
        secretWord={secretWord}
        sendAction={sendAction}
      />
    );
  }

  return <ImposterLoadingFallback />;
}
