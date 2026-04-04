import React, { memo, useEffect, useRef, useState } from 'react';
import type { ThemeConfig } from '../../../types';

export type GuesserFeedbackWord = { word: string; result: string; taskId?: string };

export type GuesserFeedbackProps = {
  correct: number;
  skipped: number;
  words: GuesserFeedbackWord[];
  theme: ThemeConfig;
  t: {
    youGuess: string;
    guessed: string;
    correct: string;
    guesserListenHint: string;
    skippedWord: string;
  };
  teamColorHex?: string;
};

export const GuesserFeedback = memo(function GuesserFeedback({
  correct,
  skipped,
  words,
  theme,
  t,
  teamColorHex,
}: GuesserFeedbackProps) {
  const lastCorrect = words.filter((w) => w.result === 'correct' || w.result === 'guessed').at(-1);
  const prevCorrectRef = useRef(correct);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (correct > prevCorrectRef.current) {
      setFlash(true);
      const id = window.setTimeout(() => setFlash(false), 600);
      prevCorrectRef.current = correct;
      return () => clearTimeout(id);
    }
    prevCorrectRef.current = correct;
  }, [correct]);

  const accentColor = teamColorHex || '#D4AF6A';

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center w-full max-w-sm animate-fade-in">
      <p className={`text-[9px] uppercase tracking-[0.5em] font-bold ${theme.textSecondary}`}>
        {t.youGuess}
      </p>

      <div key={correct} className="animate-pop-in">
        <span
          className="text-[9rem] font-sans font-black tabular-nums leading-none"
          style={{ color: accentColor }}
        >
          {correct}
        </span>
      </div>

      <p
        className={`text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 ${theme.textMain}`}
      >
        {t.guessed}
      </p>

      {lastCorrect && (
        <div
          key={lastCorrect.word}
          className={`mt-4 px-6 py-3 rounded-2xl border transition-all animate-pop-in ${
            flash ? 'scale-105' : ''
          }`}
          style={{
            borderColor: `${accentColor}33`,
            backgroundColor: `${accentColor}0D`,
          }}
        >
          <p
            className="text-2xl font-serif uppercase tracking-wide"
            style={{ color: `${accentColor}CC` }}
          >
            {lastCorrect.word}
          </p>
          <p className="text-[9px] uppercase tracking-widest font-bold mt-1 text-emerald-400/70">
            ✓ {t.correct}
          </p>
        </div>
      )}

      {correct === 0 && (
        <p
          className={`text-[10px] uppercase tracking-widest font-bold opacity-30 ${theme.textMain} animate-pulse`}
        >
          {t.guesserListenHint}
        </p>
      )}

      {skipped > 0 && (
        <p
          className={`text-[10px] uppercase tracking-widest font-bold opacity-20 ${theme.textMain}`}
        >
          {t.skippedWord}: {skipped}
        </p>
      )}
    </div>
  );
});
