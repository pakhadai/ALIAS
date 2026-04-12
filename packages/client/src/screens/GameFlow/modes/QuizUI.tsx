import React, { useState, useEffect, useRef } from 'react';
import type { GameTask, GameActionPayload } from '@alias/shared';
import type { ThemeConfig } from '../../../types';
import { HAPTIC } from '../../../utils/haptics';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';

const OPTION_BTN =
  'min-h-[60px] min-w-0 flex items-center justify-center text-center px-4 py-5 rounded-2xl font-sans font-bold text-sm sm:text-base uppercase tracking-wide transition-all duration-200 border active:scale-95 active:opacity-90 disabled:opacity-40 disabled:pointer-events-none';

const OPTION_MIX = [62, 52, 58, 48] as const;

export interface QuizUIProps {
  task: GameTask;
  disabled: boolean;
  currentTheme: ThemeConfig;
  promptLabel?: string;
  solvedByName?: string | null;
  /** From server sync: playerId who solved the current task (if set). */
  currentTaskAnswered?: string;
  onAction: (payload: GameActionPayload) => void;
}

/**
 * Quiz (Blitz): prompt + 2×2 option grid; sends GUESS_OPTION with selectedOption.
 */
export function QuizUI({
  task,
  disabled,
  currentTheme,
  promptLabel,
  solvedByName,
  currentTaskAnswered,
  onAction,
}: QuizUIProps): React.ReactElement {
  const haptic = useHapticFeedback();
  const [picked, setPicked] = useState<string | null>(null);
  const [lockedOut, setLockedOut] = useState(false);
  const wrongClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const options = task.options ?? [];

  useEffect(() => {
    setPicked(null);
    setLockedOut(false);
    if (wrongClearRef.current) {
      clearTimeout(wrongClearRef.current);
      wrongClearRef.current = null;
    }
    if (lockoutRef.current) {
      clearTimeout(lockoutRef.current);
      lockoutRef.current = null;
    }
  }, [task.id]);

  const handlePick = (opt: string) => {
    if (disabled) return;
    if (lockedOut) return;
    if (picked !== null && picked === task.answer) return;
    const correct = opt === task.answer;
    if (correct) {
      setPicked(opt);
    } else {
      setPicked(opt);
      setLockedOut(true);
      if (lockoutRef.current) clearTimeout(lockoutRef.current);
      lockoutRef.current = setTimeout(() => {
        setLockedOut(false);
        lockoutRef.current = null;
      }, 2000);
      if (wrongClearRef.current) clearTimeout(wrongClearRef.current);
      wrongClearRef.current = setTimeout(() => {
        setPicked(null);
        wrongClearRef.current = null;
      }, 650);
    }
    haptic(correct ? HAPTIC.quizCorrect : HAPTIC.quizWrong);
    onAction({ action: 'GUESS_OPTION', data: { selectedOption: opt } });
  };

  const reveal = picked !== null;
  const solved = picked !== null && picked === task.answer;
  const solvedBySomeone = !!currentTaskAnswered;
  const systemReveal =
    currentTaskAnswered === '__timeout__' || currentTaskAnswered === '__all_wrong__';
  const shouldRevealCorrect = solvedBySomeone || reveal;

  const kindLabel =
    task.kind === 'SYNONYM'
      ? 'ЗНАЙДИ СИНОНІМ'
      : task.kind === 'ANTONYM'
        ? 'АНТОНІМ'
        : task.kind === 'TRANSLATION'
          ? 'ПЕРЕКЛАД'
          : task.kind === 'TABOO'
            ? 'ВГАДАЙ ЗА ПІДКАЗКАМИ'
            : null;

  return (
    <div className="w-full max-w-sm flex flex-col gap-8 items-center pb-28">
      {kindLabel && (
        <div className="px-4 py-2 rounded-full border border-ui-border bg-ui-surface shadow-sm transition-colors duration-200">
          <span
            className={`text-[10px] uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary}`}
          >
            {kindLabel}
          </span>
        </div>
      )}
      <div
        key={task.id}
        className="w-full min-h-[140px] flex items-center justify-center p-8 rounded-4xl border border-ui-border bg-ui-surface shadow-2xl transition-all duration-200 animate-fade-in"
      >
        <h2
          className={`${currentTheme.textMain} font-sans font-black text-3xl sm:text-4xl text-center leading-tight tracking-tight wrap-break-word w-full`}
        >
          {promptLabel ?? task.prompt}
        </h2>
      </div>

      {solvedBySomeone && (
        <div className="w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-ui-border bg-ui-surface transition-all duration-200 animate-fade-in">
            <span className={`text-sm font-sans font-bold ${currentTheme.textMain}`}>
              {solvedByName
                ? `${solvedByName} +1`
                : systemReveal
                  ? currentTaskAnswered === '__all_wrong__'
                    ? 'Ніхто не вгадав'
                    : 'Час вийшов'
                  : '+1'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 w-full">
        {options.slice(0, 4).map((opt, i) => {
          const isCorrect = shouldRevealCorrect && opt === task.answer;
          const isWrongPick = reveal && picked === opt && opt !== task.answer;
          const mix = OPTION_MIX[i % OPTION_MIX.length];
          return (
            <button
              key={`${task.id}-${i}-${opt}`}
              type="button"
              disabled={disabled || solved || solvedBySomeone || lockedOut || isWrongPick}
              onClick={() => handlePick(opt)}
              className={`${OPTION_BTN} text-ui-accent-contrast hover:brightness-105 ${
                isCorrect ? 'ring-2 ring-ui-success scale-[1.02]' : ''
              } ${isWrongPick ? 'opacity-50 line-through' : ''}`}
              style={{
                backgroundColor: `color-mix(in_srgb, var(--ui-accent) ${mix}%, var(--ui-bg))`,
                borderColor: `color-mix(in_srgb, var(--ui-accent) 45%, var(--ui-border))`,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
