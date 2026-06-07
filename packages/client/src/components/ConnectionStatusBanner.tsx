import React from 'react';
import { Loader2 } from 'lucide-react';
import { systemBannerClass } from '../constants/typography';
import { useGame } from '../context/GameContext';
import { useT } from '../hooks/useT';

/** Fixed top banner while socket is restoring session (room:rejoin in flight). */
export function ConnectionStatusBanner() {
  const { isReconnecting } = useGame();
  const t = useT();

  if (!isReconnecting) return null;

  return (
    <div
      className={`fixed left-0 right-0 z-[var(--z-banner)] flex items-center justify-center gap-2 py-2.5 px-4 ${systemBannerClass} bg-[color-mix(in_srgb,var(--ui-warning)_85%,transparent)] text-ui-accent-contrast shadow-lg border-b border-[color-mix(in_srgb,var(--ui-warning)_35%,transparent)] top-[var(--tma-inset-top)]`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
      {t.restoringConnection ?? 'Restoring connection...'}
    </div>
  );
}
