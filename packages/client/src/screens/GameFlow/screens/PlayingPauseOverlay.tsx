import React, { memo, useState, useEffect } from 'react';
import type { ThemeConfig } from '../../../types';
import { bottomSheetBackdropClass, bottomSheetPanelClass } from '../../../components/Shared';

export type PlayingPauseOverlayProps = {
  currentTheme: ThemeConfig;
  t: { paused: string; tapResume: string };
  onResume: () => void;
};

export const PlayingPauseOverlay = memo(function PlayingPauseOverlay({
  currentTheme,
  t,
  onResume,
}: PlayingPauseOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleResume = () => {
    setVisible(false);
    setTimeout(onResume, 300);
  };

  return (
    <div
      className={`${bottomSheetBackdropClass(visible, 'z-50', 'absolute')} cursor-pointer`}
      onClick={handleResume}
    >
      <div
        className={bottomSheetPanelClass(
          visible,
          'px-8 py-16 text-center w-full shadow-2xl active:scale-[0.98] transition-transform duration-200'
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleResume();
        }}
      >
        <div className="flex justify-center mb-6">
          <div className="h-1.5 w-16 rounded-full bg-(--ui-border)" aria-hidden />
        </div>

        <span className="material-symbols-outlined text-(--ui-accent) text-[80px] mb-6 block">
          play_circle
        </span>

        <p className={`text-4xl font-serif ${currentTheme.textMain} uppercase tracking-widest`}>
          {t.paused}
        </p>

        <p className={`text-xs font-bold ${currentTheme.textSecondary} uppercase tracking-[0.2em] mt-6 opacity-80`}>
          {t.tapResume}
        </p>
      </div>
    </div>
  );
});
