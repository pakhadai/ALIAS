import React from 'react';
import type { ThemeConfig } from '../../../types';

type TPlaying = Record<string, string>;

export interface ClassicWordCardProps {
  displayPrompt: string;
  isCriticalTime: boolean;
  wordExit: 'left' | 'right' | null;
  currentTheme: ThemeConfig;
}

export interface ClassicActionFooterProps {
  t: TPlaying;
  onCorrect: (e: React.MouseEvent) => void;
  onSkip: (e: React.MouseEvent) => void;
}

/**
 * Word card for classic / translation / synonyms explainer view.
 */
export const ClassicWordCard: React.FC<ClassicWordCardProps> = ({
  displayPrompt,
  isCriticalTime,
  wordExit,
  currentTheme,
}) => (
  <div
    key={displayPrompt}
    className={`w-full max-w-sm aspect-3/4 max-h-[55vh] bg-(--ui-card) rounded-4xl shadow-2xl flex items-center justify-center p-10 relative transform border transition-all duration-150 ease-out ${
      isCriticalTime
        ? 'border-[color-mix(in_srgb,var(--ui-danger)_35%,transparent)]'
        : 'border-(--ui-border)'
    } ${
      wordExit === 'right'
        ? 'opacity-0 translate-x-4'
        : wordExit === 'left'
          ? 'opacity-0 -translate-x-4'
          : 'opacity-100 translate-x-0 animate-pop-in'
    }`}
  >
    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-px bg-(--ui-border)" />
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-8 h-px bg-(--ui-border)" />
    <h2
      className={`${currentTheme.textMain} font-sans font-black text-5xl sm:text-6xl text-center leading-tight tracking-tight uppercase wrap-break-word w-full drop-shadow-md`}
    >
      {displayPrompt}
    </h2>
  </div>
);

/**
 * Explainer Correct / Skip controls (fixed footer).
 */
export const ClassicActionFooter: React.FC<ClassicActionFooterProps> = ({
  t,
  onCorrect,
  onSkip,
}) => (
  <footer className="w-full fixed bottom-0 left-0 z-20 flex pb-env-bottom">
    <button
      type="button"
      onClick={onSkip}
      className="flex-1 h-24 sm:h-28 bg-[color-mix(in_srgb,var(--ui-danger)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] active:bg-[color-mix(in_srgb,var(--ui-danger)_38%,transparent)] transition-colors flex flex-col items-center justify-center gap-2 group border-t border-(--ui-border)"
    >
      <span className="material-symbols-outlined text-(--ui-danger) text-3xl group-active:scale-90 transition-transform">
        close
      </span>
      <span className="text-(--ui-danger) text-[10px] tracking-[0.25em] uppercase font-bold opacity-80 group-hover:opacity-100 transition-opacity">
        {t.skip}
      </span>
    </button>
    <button
      type="button"
      onClick={onCorrect}
      className="flex-1 h-24 sm:h-28 bg-[color-mix(in_srgb,var(--ui-success)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-success)_30%,transparent)] active:bg-[color-mix(in_srgb,var(--ui-success)_38%,transparent)] transition-colors flex flex-col items-center justify-center gap-2 group border-t border-(--ui-border) border-l border-l-(--ui-border)"
    >
      <span className="material-symbols-outlined text-(--ui-success) text-3xl group-active:scale-90 transition-transform font-bold">
        check
      </span>
      <span className="text-(--ui-success) text-[10px] tracking-[0.25em] uppercase font-bold opacity-80 group-hover:opacity-100 transition-opacity">
        {t.correct}
      </span>
    </button>
  </footer>
);
