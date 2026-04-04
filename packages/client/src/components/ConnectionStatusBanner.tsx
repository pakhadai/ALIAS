import React from 'react';
import { Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { TRANSLATIONS } from '../constants';

/** Fixed top banner while socket is restoring session (room:rejoin in flight). */
export function ConnectionStatusBanner() {
  const { isReconnecting, settings } = useGame();
  const t = TRANSLATIONS[settings.language];

  if (!isReconnecting) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold uppercase tracking-wider bg-amber-500/95 text-black shadow-lg"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
      {t.restoringConnection ?? 'Restoring connection...'}
    </div>
  );
}
