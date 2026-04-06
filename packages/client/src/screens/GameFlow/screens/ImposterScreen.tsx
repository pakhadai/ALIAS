import { useEffect, useMemo, useState } from 'react';
import { GameMode } from '@alias/shared';
import { useGame } from '../../../context/GameContext';
import { Button } from '../../../components/Button';

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function ImposterScreen() {
  const {
    gameMode,
    currentTheme,
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

  const [isFlipped, setIsFlipped] = useState(false);

  const isOffline = gameMode === 'OFFLINE';
  const isDark = currentTheme.isDark;
  const activeRevealPlayer = useMemo(
    () =>
      isOffline ? players[imposterOfflineRevealIndex] : players.find((p) => p.id === myPlayerId),
    [isOffline, players, imposterOfflineRevealIndex, myPlayerId]
  );

  useEffect(() => {
    setIsFlipped(false);
  }, [imposterPhase, activeRevealPlayer?.id]);

  const revealIsImposter = isOffline
    ? !!activeRevealPlayer?.id && activeRevealPlayer.id === imposterPlayerId
    : !!imposterSecret?.isImposter;

  const secretWord = isOffline ? imposterWord : imposterSecret?.word;

  // Discussion timer (online state usually comes from server; offline is local)
  useEffect(() => {
    if (imposterPhase !== 'DISCUSSION') return;
    if (isPaused) return;
    if (timeLeft <= 0) return;
    const t = window.setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, (typeof prev === 'number' ? prev : 0) - 1));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [imposterPhase, isPaused, timeLeft, setTimeLeft]);

  useEffect(() => {
    if (imposterPhase !== 'DISCUSSION') return;
    if (timeLeft > 0) return;
    // In online mode the server will transition automatically; in offline we trigger it.
    if (isOffline) {
      sendAction({ action: 'IMPOSTER_END_GAME' });
    }
  }, [imposterPhase, timeLeft, isOffline, sendAction]);

  if (imposterPhase === 'REVEAL') {
    const canReveal = !!activeRevealPlayer;
    const readyDisabled = !isFlipped || !canReveal;
    return (
      <div className="animate-page-in px-4 py-6">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <div className="rounded-2xl border border-white/10 bg-(--ui-surface) p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm opacity-70">Імпостер — перегляд карток</div>
                <div className="mt-1 text-lg font-semibold">
                  {isOffline ? `Гравець: ${activeRevealPlayer?.name ?? '—'}` : 'Твоя картка'}
                </div>
                <div className="mt-1 text-sm opacity-70">
                  Готові: {Math.min(revealedPlayerIds.length, players.length)}/{players.length}
                </div>
              </div>
              <Button variant="ghost" onClick={togglePause}>
                {isPaused ? 'Продовжити' : 'Пауза'}
              </Button>
            </div>
          </div>

          {isOffline && !isFlipped ? (
            <div className="rounded-2xl border border-white/10 bg-(--ui-surface) p-4 text-sm opacity-80">
              Передай телефон гравцю{' '}
              <span className="font-semibold">{activeRevealPlayer?.name ?? '—'}</span> і натисни на
              картку, щоб перевернути.
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canReveal}
            onClick={() => setIsFlipped(true)}
            className={[
              'w-full rounded-3xl border border-white/10 p-8 text-center transition',
              isFlipped
                ? revealIsImposter
                  ? isDark
                    ? 'bg-rose-500/12 border-rose-400/25 text-rose-100'
                    : 'bg-rose-100 border-rose-300 text-rose-900'
                  : 'bg-(--ui-card)'
                : 'bg-(--ui-surface) hover:bg-(--ui-surface-hover)',
              !canReveal ? 'opacity-60' : '',
            ].join(' ')}
          >
            {!isFlipped ? (
              <div className="space-y-2">
                <div className="text-2xl font-semibold">Натисни, щоб перевернути</div>
                <div className="text-sm opacity-70">Не показуй іншим</div>
              </div>
            ) : revealIsImposter ? (
              <div className="space-y-2">
                <div className="text-2xl font-semibold">Ти — Імпостер!</div>
                <div className="text-sm opacity-80">Спробуй не видати себе</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm opacity-70">Секретне слово</div>
                <div className="text-3xl font-extrabold">{secretWord ?? '...'}</div>
              </div>
            )}
          </button>

          <Button
            className="w-full"
            disabled={readyDisabled}
            onClick={() => sendAction({ action: 'IMPOSTER_READY' })}
          >
            Я подивився / Готовий
          </Button>
        </div>
      </div>
    );
  }

  if (imposterPhase === 'DISCUSSION') {
    return (
      <div className="animate-page-in px-4 py-6">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <div className="rounded-2xl border border-white/10 bg-(--ui-surface) p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm opacity-70">Імпостер — обговорення</div>
                <div className="mt-2 text-5xl font-extrabold tabular-nums">
                  {formatTime(timeLeft)}
                </div>
              </div>
              <Button variant="ghost" onClick={togglePause}>
                {isPaused ? 'Продовжити' : 'Пауза'}
              </Button>
            </div>
          </div>

          <Button className="w-full" onClick={() => sendAction({ action: 'IMPOSTER_END_GAME' })}>
            Гру завершено / Відгадали
          </Button>
        </div>
      </div>
    );
  }

  if (imposterPhase === 'RESULTS') {
    const imposter = players.find((p) => p.id === imposterPlayerId);
    return (
      <div className="animate-page-in px-4 py-6">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <div className="rounded-2xl border border-white/10 bg-(--ui-surface) p-4">
            <div className="text-sm opacity-70">Імпостер — результати</div>
            <div className="mt-3 space-y-2">
              <div className="text-sm opacity-70">Секретне слово було</div>
              <div className="text-3xl font-extrabold">{secretWord ?? '...'}</div>
              <div className="mt-4 text-sm opacity-70">Імпостером був(ла)</div>
              <div className="text-xl font-semibold">{imposter?.name ?? '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="ghost" onClick={() => sendAction({ action: 'RESET_GAME' })}>
              Повернутися в лоббі
            </Button>
            <Button onClick={() => sendAction({ action: 'REMATCH' })}>Грати ще раз</Button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for desync/loading
  return (
    <div className="animate-page-in px-4 py-6">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-white/10 bg-(--ui-surface) p-4">
        <div className="text-sm opacity-70">Імпостер</div>
        <div className="mt-2 text-lg font-semibold">Завантаження…</div>
      </div>
    </div>
  );
}
