import React, { useState, useEffect, useRef } from 'react';
import type { GameTask, GameActionPayload } from '@alias/shared';
import type { ThemeConfig } from '../../../types';
import { HAPTIC } from '../../../utils/haptics';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';

const OPTION_BTN =
  'flex items-center justify-center text-center px-3 py-6 rounded-2xl font-sans font-bold text-sm sm:text-base uppercase tracking-wide transition-all duration-200 border active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none';

const OPTION_MIX = [62, 52, 58, 48] as const;

export interface QuizUIProps {
  task: GameTask;
  disabled: boolean;
  currentTheme: ThemeConfig;
  promptLabel?: string;
  onAction: (payload: GameActionPayload) => void;
}

/**
 * Quiz (Blitz): prompt + 2×2 option grid; sends GUESS_OPTION with selectedOption.
 */
export const QuizUI: React.FC<QuizUIProps> = ({
  task,
  disabled,
  currentTheme,
  promptLabel,
  onAction,
}) => {
  const haptic = useHapticFeedback();
  const [picked, setPicked] = useState<string | null>(null);
  const wrongClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const options = task.options ?? [];

  useEffect(() => {
    setPicked(null);
    if (wrongClearRef.current) {
      clearTimeout(wrongClearRef.current);
      wrongClearRef.current = null;
    }
  }, [task.id]);

  const handlePick = (opt: string) => {
    if (disabled) return;
    if (picked !== null && picked === task.answer) return;
    const correct = opt === task.answer;
    if (correct) {
      setPicked(opt);
    } else {
      setPicked(opt);
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

  return (
    <div className="w-full max-w-sm flex flex-col gap-8 items-center pb-28">
      <div
        className="w-full min-h-[140px] flex items-center justify-center p-8 rounded-4xl border border-(--ui-border) bg-(--ui-surface) shadow-2xl"
      >
        <h2
          className={`${currentTheme.textMain} font-sans font-black text-3xl sm:text-4xl text-center leading-tight tracking-tight wrap-break-word w-full`}
        >
          {promptLabel ?? task.prompt}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        {options.slice(0, 4).map((opt, i) => {
          const isCorrect = reveal && opt === task.answer;
          const isWrongPick = reveal && picked === opt && opt !== task.answer;
          const mix = OPTION_MIX[i % OPTION_MIX.length];
          return (
            <button
              key={`${task.id}-${i}-${opt}`}
              type="button"
              disabled={disabled || solved || isWrongPick}
              onClick={() => handlePick(opt)}
              className={`${OPTION_BTN} text-(--ui-accent-contrast) hover:brightness-105 ${
                isCorrect ? 'ring-2 ring-(--ui-success) scale-[1.02]' : ''
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
};
