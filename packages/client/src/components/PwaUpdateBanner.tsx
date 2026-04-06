import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { TRANSLATIONS } from '../constants';
import { applyPwaUpdate } from '../pwa-client';

export const PwaUpdateBanner: React.FC = () => {
  const { settings, currentTheme } = useGame();
  const t = TRANSLATIONS[settings.general.language];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onNeed = () => setVisible(true);
    window.addEventListener('pwa:need-refresh', onNeed);
    return () => window.removeEventListener('pwa:need-refresh', onNeed);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-100 flex justify-center px-4 pointer-events-none"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      role="status"
    >
      <div className="pointer-events-auto flex max-w-lg w-full items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl border border-(--ui-border) bg-(--ui-card) text-(--ui-fg) backdrop-blur-md">
        <p className="flex-1 text-xs font-sans leading-snug">{t.pwaUpdateMessage}</p>
        <button
          type="button"
          onClick={() => applyPwaUpdate()}
          className="shrink-0 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-(--ui-accent) text-(--ui-accent-contrast) hover:opacity-95 transition-opacity"
        >
          {t.pwaUpdateReload}
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="shrink-0 text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 text-(--ui-fg-muted)"
          aria-label={t.close}
        >
          {t.pwaUpdateLater}
        </button>
      </div>
    </div>
  );
};
