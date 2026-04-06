import React, { memo } from 'react';
import type { ThemeConfig } from '../../../types';
import { bottomSheetBackdropClass, bottomSheetPanelClass } from '../../../components/Shared';

export type PlayingPauseOverlayProps = {
  currentTheme: ThemeConfig;
  t: { paused: string; tapResume: string };
};

export const PlayingPauseOverlay = memo(function PlayingPauseOverlay({
  currentTheme,
  t,
}: PlayingPauseOverlayProps) {
  return (
    <div className={bottomSheetBackdropClass(true, 'z-50', 'absolute')}>
      <div className={`${bottomSheetPanelClass(true, 'px-8 py-12 text-center')}`}>
        <div className="flex justify-center mb-2">
          <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
        </div>
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
