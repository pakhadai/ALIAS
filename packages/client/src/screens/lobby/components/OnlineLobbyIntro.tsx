import React from 'react';
import { BookOpen, Copy, Gamepad2, Mail, QrCode, Share2, Timer, Trophy } from 'lucide-react';
import type { GameSettings, ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';

type T = TranslationStrings;

export function OnlineLobbyIntro(props: {
  theme: ThemeConfig;
  t: T;
  roomCode: string;
  settings: GameSettings;
  modeLabel: string;
  /** One-line hint for the selected game mode (same copy as in settings). */
  modeHint: string;
  categoriesPreview: string;
  qrCodeData: string;
  isHost: boolean;
  onShare: () => void;
  onInviteFriends: () => void;
  onShowQr: () => void;
  onOpenSettings: () => void;
}): React.ReactNode {
  const {
    theme,
    t,
    roomCode,
    settings,
    modeLabel,
    modeHint,
    categoriesPreview,
    qrCodeData,
    isHost,
    onShare,
    onInviteFriends,
    onShowQr,
    onOpenSettings,
  } = props;

  return (
    <div className="w-full max-w-sm text-center space-y-4">
      <p className={`text-[8px] uppercase tracking-[0.5em] font-bold ${theme.textSecondary}`}>
        {t.roomCode}
      </p>
      <div className="flex justify-center">
        <div
          data-testid="lobby-room-code"
          className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl border border-ui-border bg-ui-surface shadow-[0_0_0_1px_color-mix(in_srgb,var(--ui-accent)_15%,transparent),0_4px_24px_-4px_color-mix(in_srgb,var(--ui-accent)_20%,transparent)]"
        >
          <span className={`text-4xl font-serif tracking-[0.25em] ${theme.textMain}`}>
            {roomCode}
          </span>
          <button
            type="button"
            onClick={onShare}
            className="p-1.5 rounded-xl hover:bg-ui-surface-hover transition-all active:scale-95"
            aria-label={(t as Record<string, string>).copyRoomCodeTitle ?? 'Copy room code'}
          >
            <Copy size={16} className={`${theme.iconColor} opacity-60`} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all active:scale-[0.98]"
        >
          <Share2 size={16} className={theme.iconColor} />
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-ui-fg-muted">
            {t.share ?? 'Share'}
          </span>
        </button>
        <button
          type="button"
          onClick={onInviteFriends}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[color-mix(in_srgb,var(--ui-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--ui-accent)_16%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-accent)_22%,transparent)] transition-all active:scale-[0.98]"
        >
          <Mail size={16} className={theme.iconColor} />
          <span className="text-[10px] font-bold tracking-[0.08em] text-ui-fg">
            💌 Запросити друзів
          </span>
        </button>
        <button
          type="button"
          onClick={onShowQr}
          disabled={!qrCodeData}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all active:scale-[0.98] disabled:opacity-40"
        >
          <QrCode size={16} className={theme.iconColor} />
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-ui-fg-muted">
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
        className="w-full rounded-3xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all active:scale-[0.99] px-5 py-4 disabled:opacity-60"
      >
        {modeHint ? (
          <div className="text-left mb-3">
            <p className="text-[8px] uppercase tracking-[0.28em] font-bold text-ui-fg-muted opacity-70">
              {(t as Record<string, string>).lobbyModeHintLabel}
            </p>
            <p className={`text-[11px] leading-snug mt-1 line-clamp-3 ${theme.textSecondary}`}>
              {modeHint}
            </p>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="flex items-center gap-2">
            <Timer size={14} className={theme.iconColor} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-ui-fg-muted">
              {'classicRoundTime' in settings.mode ? settings.mode.classicRoundTime : 0}s
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy size={14} className={theme.iconColor} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-ui-fg-muted">
              {settings.general.scoreToWin} {t.pts}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Gamepad2 size={14} className={theme.iconColor} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-ui-fg-muted">
              {modeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen size={14} className={theme.iconColor} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-ui-fg-muted truncate">
              {categoriesPreview || '—'}
            </span>
          </div>
        </div>

        {settings.general.customDeckCode && (
          <div className="mt-3 rounded-2xl border border-ui-border bg-ui-card px-4 py-3 text-left">
            <p className="text-[8px] uppercase tracking-[0.25em] font-bold text-ui-fg-muted">
              {t.customDeckLobbyLabel}
            </p>
            <p className={`text-sm font-semibold leading-snug ${theme.textMain}`}>
              {settings.general.customDeckName || settings.general.customDeckCode}
            </p>
            <p className="text-[10px] font-mono mt-0.5 opacity-60 text-ui-fg-muted">
              {settings.general.customDeckCode}
            </p>
          </div>
        )}

        {isHost && (
          <p className="mt-3 text-[9px] uppercase tracking-[0.4em] font-bold opacity-30 text-ui-fg-muted">
            {t.tapToEdit ?? 'Натисніть, щоб змінити'}
          </p>
        )}
      </button>
    </div>
  );
}
