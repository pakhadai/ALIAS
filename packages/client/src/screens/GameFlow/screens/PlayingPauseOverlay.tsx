import React, { memo } from 'react';
import type { ThemeConfig } from '../../../types';

export type PlayingPauseOverlayProps = {
  currentTheme: ThemeConfig;
  t: { paused: string; tapResume: string };
  isHost: boolean;
};

export const PlayingPauseOverlay = memo(function PlayingPauseOverlay({
  currentTheme,
  t,
  isHost,
}: PlayingPauseOverlayProps) {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[50] animate-fade-in">
      <div
        className={`${currentTheme.card} border border-[color:var(--ui-border)] rounded-[3rem] p-16 shadow-2xl text-center`}
      >
        <span className="material-symbols-outlined text-champagne-gold text-6xl mb-4 block">
          pause_circle
        </span>
        <p className={`text-2xl font-serif ${currentTheme.textMain} uppercase tracking-widest`}>
          {t.paused}
        </p>
        {isHost && (
          <p className={`text-[10px] ${currentTheme.textSecondary} uppercase tracking-wider mt-4`}>
            {t.tapResume}
          </p>
        )}
      </div>
    </div>
  );
});
