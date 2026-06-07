import React, { memo } from 'react';
import { useDeferredOpen } from '../../../hooks/useDeferredOpen';
import type { ThemeConfig } from '../../../types';
import { ModalSheet } from '../../../components/ModalSheet';

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
  const [visible, setVisible] = useDeferredOpen();

  const handleResume = () => {
    setVisible(false);
    setTimeout(onResume, 300);
  };

  return (
    <ModalSheet
      open={visible}
      onClose={handleResume}
      zLayer="modalLow"
      backdropClassName="cursor-pointer"
      onBackdropClick={handleResume}
      onPanelClick={handleResume}
      showHandle
      paddedContent={false}
      panelClassName="px-8 py-16 text-center w-full shadow-2xl active:scale-[0.98] transition-transform duration-200"
    >
      <span className="material-symbols-outlined text-ui-accent text-[80px] mb-6 block">
        play_circle
      </span>

      <p className={`text-4xl font-serif ${currentTheme.textMain} uppercase tracking-widest`}>
        {t.paused}
      </p>

      <p
        className={`text-xs font-bold ${currentTheme.textSecondary} uppercase tracking-[0.2em] mt-6 opacity-80`}
      >
        {t.tapResume}
      </p>
    </ModalSheet>
  );
});
