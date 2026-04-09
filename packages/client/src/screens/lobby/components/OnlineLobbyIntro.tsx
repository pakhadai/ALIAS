import React from 'react';
import { BookOpen, Gamepad2, QrCode, Share2, Timer, Trophy } from 'lucide-react';
import type { GameSettings, ThemeConfig } from '../../../types';
import { TRANSLATIONS } from '../../../constants';

type T = (typeof TRANSLATIONS)['EN'];

export function OnlineLobbyIntro(props: {
  theme: ThemeConfig;
  t: T;
  roomCode: string;
  settings: GameSettings;
  modeLabel: string;
  categoriesPreview: string;
  qrCodeData: string;
  isHost: boolean;
  onShare: () => void;
  onShowQr: () => void;
  onOpenSettings: () => void;
}): React.ReactNode {
  const {
    theme,
    t,
    roomCode,
    settings,
    modeLabel,
    categoriesPreview,
    qrCodeData,
    isHost,
    onShare,
    onShowQr,
    onOpenSettings,
  } = props;

  return (
    <div className="w-full max-w-sm text-center space-y-4">
      <p className={`text-[8px] uppercase tracking-[0.5em] font-bold ${theme.textSecondary}`}>
        {t.roomCode}
      </p>
      <div
        data-testid="lobby-room-code"
        className={`text-4xl font-serif tracking-[0.2em] ${theme.textMain}`}
      >
        {roomCode}
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-(--ui-border) bg-(--ui-surface) hover:bg-(--ui-surface-hover) transition-all active:scale-[0.98]"
        >
          <Share2 size={16} className={theme.iconColor} />
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-(--ui-fg-muted)">
            {t.share ?? 'Share'}
          </span>
        </button>
        <button
          type="button"
          onClick={onShowQr}
          disabled={!qrCodeData}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-(--ui-border) bg-(--ui-surface) hover:bg-(--ui-surface-hover) transition-all active:scale-[0.98] disabled:opacity-40"
        >
          <QrCode size={16} className={theme.iconColor} />
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-(--ui-fg-muted)">
            {t.qrCode ?? 'QR'}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          if (isHost) onOpenSettings();
        }}
        disabled={!isHost}
        className="w-full rounded-3xl border border-(--ui-border) bg-(--ui-surface) hover:bg-(--ui-surface-hover) transition-all active:scale-[0.99] px-5 py-4 disabled:opacity-60"
      >
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="flex items-center gap-2">
            <Timer size={14} className={theme.iconColor} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-(--ui-fg-muted)">
              {'classicRoundTime' in settings.mode ? settings.mode.classicRoundTime : 0}s
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy size={14} className={theme.iconColor} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-(--ui-fg-muted)">
              {settings.general.scoreToWin} {t.pts}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Gamepad2 size={14} className={theme.iconColor} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-(--ui-fg-muted)">
              {modeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen size={14} className={theme.iconColor} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-(--ui-fg-muted) truncate">
              {categoriesPreview || '—'}
            </span>
          </div>
        </div>

        {settings.general.customDeckCode && (
          <div className="mt-3 rounded-2xl border border-(--ui-border) bg-(--ui-card) px-4 py-3 text-left">
            <p className="text-[8px] uppercase tracking-[0.25em] font-bold text-(--ui-fg-muted)">
              {t.customDeckLobbyLabel}
            </p>
            <p className={`text-sm font-semibold leading-snug ${theme.textMain}`}>
              {settings.general.customDeckName || settings.general.customDeckCode}
            </p>
            <p className="text-[10px] font-mono mt-0.5 opacity-60 text-(--ui-fg-muted)">
              {settings.general.customDeckCode}
            </p>
          </div>
        )}

        {isHost && (
          <p className="mt-3 text-[9px] uppercase tracking-[0.4em] font-bold opacity-30 text-(--ui-fg-muted)">
            {t.tapToEdit ?? 'Натисніть, щоб змінити'}
          </p>
        )}
      </button>
    </div>
  );
}
