import React, { useState, useEffect, useRef } from 'react';
import type { GameTask, GameActionPayload } from '@alias/shared';
import type { ThemeConfig } from '../../../types';
import { HAPTIC } from '../../../utils/haptics';
import { useHapticFeedback } from '../../../hooks/useHapticFeedback';

const OPTION_BTN =
  'flex items-center justify-center text-center px-3 py-6 rounded-2xl font-sans font-bold text-sm sm:text-base uppercase tracking-wide transition-all duration-200 border-2 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none';

const OPTION_STYLES = [
  'bg-sky-600/90 border-sky-400 text-white hover:bg-sky-500',
  'bg-amber-600/90 border-amber-400 text-white hover:bg-amber-500',
  'bg-violet-600/90 border-violet-400 text-white hover:bg-violet-500',
  'bg-emerald-600/90 border-emerald-400 text-white hover:bg-emerald-500',
];

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
        className={`w-full min-h-[140px] flex items-center justify-center p-8 rounded-[2rem] border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] shadow-inner-glow`}
      >
        <h2
          className={`${currentTheme.textMain} font-sans font-black text-3xl sm:text-4xl text-center leading-tight tracking-tight break-words w-full`}
        >
          {promptLabel ?? task.prompt}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        {options.slice(0, 4).map((opt, i) => {
          const isCorrect = reveal && opt === task.answer;
          const isWrongPick = reveal && picked === opt && opt !== task.answer;
          return (
            <button
              key={`${task.id}-${i}-${opt}`}
              type="button"
              disabled={disabled || solved || isWrongPick}
              onClick={() => handlePick(opt)}
              className={`${OPTION_BTN} ${OPTION_STYLES[i % OPTION_STYLES.length]} ${
                isCorrect ? 'ring-4 ring-emerald-300 scale-[1.02]' : ''
              } ${isWrongPick ? 'opacity-50 line-through' : ''}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};
