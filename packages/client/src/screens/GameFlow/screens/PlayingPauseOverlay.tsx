import React, { memo } from 'react';
import type { ThemeConfig } from '../../../types';

export type PlayingPauseOverlayProps = {
  currentTheme: ThemeConfig;
  t: { paused: string; tapResume: string };
};

export const PlayingPauseOverlay = memo(function PlayingPauseOverlay({
  currentTheme,
  t,
}: PlayingPauseOverlayProps) {
  return (
    <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--ui-bg)_78%,transparent)] backdrop-blur-xl flex items-center justify-center z-50 animate-fade-in">
      <div
        className={`${currentTheme.card} border border-(--ui-border) rounded-[3rem] p-16 shadow-2xl text-center`}
      >
        <span className="material-symbols-outlined text-(--ui-accent) text-6xl mb-4 block">
          pause_circle
        </span>
        <p className={`text-2xl font-serif ${currentTheme.textMain} uppercase tracking-widest`}>
          {t.paused}
        </p>
        <p className={`text-[10px] ${currentTheme.textSecondary} uppercase tracking-wider mt-4`}>
          {t.tapResume}
        </p>
      </div>
    </div>
  );
});
