import React, { memo, useState } from 'react';
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
  const [open, setOpen] = useState(true);

  const handleResume = () => setOpen(false);

  return (
    <ModalSheet
      open={open}
      onClose={handleResume}
      onExited={onResume}
      zLayer="modalLow"
      size="compact"
      backdropClassName="cursor-pointer"
      onBackdropClick={handleResume}
      onPanelClick={handleResume}
    >
      <span className="material-symbols-outlined text-ui-accent text-[80px] mb-6 mt-8 block">
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
