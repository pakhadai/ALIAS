import React from 'react';
import { Loader2 } from 'lucide-react';
import { systemBannerClass } from '../constants/typography';
import { zIndex } from '../constants/zIndex';
import { useGame } from '../context/GameContext';
import { useT } from '../hooks/useT';

/** Fixed top banner while socket is restoring session (room:rejoin in flight). */
export function ConnectionStatusBanner() {
  const { isReconnecting } = useGame();
  const t = useT();

  if (!isReconnecting) return null;

  return (
    <div
      className={`ui-status-banner ui-status-banner--warning fixed left-0 right-0 ${zIndex.banner} flex items-center justify-center gap-2 py-2.5 px-4 ${systemBannerClass} top-[var(--tma-banner-top)]`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-4 h-4 animate-spin shrink-0 opacity-90" aria-hidden />
      {t.restoringConnection ?? 'Restoring connection...'}
    </div>
  );
}
