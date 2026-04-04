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
    className={`w-full max-w-sm aspect-[3/4] max-h-[55vh] bg-card-dark-bg rounded-[2rem] shadow-premium-card shadow-inner-glow flex items-center justify-center p-10 relative transform border transition-all duration-150 ease-out ${
      isCriticalTime ? 'border-red-500/40' : 'border-[color:var(--ui-border)]'
    } ${
      wordExit === 'right'
        ? 'opacity-0 translate-x-4'
        : wordExit === 'left'
          ? 'opacity-0 -translate-x-4'
          : 'opacity-100 translate-x-0 animate-pop-in'
    }`}
  >
    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-[1px] bg-[color:var(--ui-border)]" />
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-8 h-[1px] bg-[color:var(--ui-border)]" />
    <h2
      className={`${currentTheme.textMain} font-sans font-black text-5xl sm:text-6xl text-center leading-tight tracking-tight uppercase break-words w-full drop-shadow-md`}
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
  <footer
    className="w-full fixed bottom-0 left-0 z-20 flex"
    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
  >
    <button
      type="button"
      onClick={onSkip}
      className="flex-1 h-24 sm:h-28 bg-burgundy-deep hover:bg-[#351A1A] active:bg-[#201010] transition-colors flex flex-col items-center justify-center gap-2 group border-t border-[color:var(--ui-border)]"
    >
      <span className="material-symbols-outlined text-burgundy-text text-3xl group-active:scale-90 transition-transform">
        close
      </span>
      <span className="text-burgundy-text/80 text-[10px] tracking-[0.25em] uppercase font-bold group-hover:text-burgundy-text transition-colors">
        {t.skip}
      </span>
    </button>
    <button
      type="button"
      onClick={onCorrect}
      className="flex-1 h-24 sm:h-28 bg-forest-green-deep hover:bg-[#263333] active:bg-[#182020] transition-colors flex flex-col items-center justify-center gap-2 group border-t border-[color:var(--ui-border)] border-l border-l-[color:var(--ui-border)]"
    >
      <span className="material-symbols-outlined text-forest-green-text text-3xl group-active:scale-90 transition-transform font-bold">
        check
      </span>
      <span className="text-forest-green-text/80 text-[10px] tracking-[0.25em] uppercase font-bold group-hover:text-forest-green-text transition-colors">
        {t.correct}
      </span>
    </button>
  </footer>
);
