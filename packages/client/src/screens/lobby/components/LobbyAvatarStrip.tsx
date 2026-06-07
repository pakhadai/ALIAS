import React from 'react';
import { Crown, MoreHorizontal, X } from 'lucide-react';
import type { Player, ThemeConfig } from '../../../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { MAX_PLAYERS } from '../../../constants';
import type { TranslationStrings } from '../../../hooks/useT';
import { ScreenTitle } from '../../../components/typography/ScreenTitle';
import {
  typographyClass,
  labelSectionClass,
  labelSectionTitleClass,
  formLabelClass,
} from '../../../constants/typography';

type T = TranslationStrings;

function isPlayerSocketConnected(p: { isConnected?: boolean }): boolean {
  return p.isConnected !== false;
}

export function LobbyAvatarStrip(props: {
  theme: ThemeConfig;
  t: T;
  players: Player[];
  isHost: boolean;
  myPlayerId: string;
  recentlyJoinedIds: Set<string>;
  kickMenuPlayerId: string | null;
  setKickMenuPlayerId: (v: string | null | ((cur: string | null) => string | null)) => void;
  onKick: (p: { id: string; name: string }) => void;
}): React.ReactNode {
  const {
    theme,
    t,
    players,
    isHost,
    myPlayerId,
    recentlyJoinedIds,
    kickMenuPlayerId,
    setKickMenuPlayerId,
    onKick,
  } = props;

  return (
    <div className="w-full max-w-sm" data-testid="lobby-avatar-strip">
      <div className="flex items-center justify-between mb-3">
        <ScreenTitle as="h3" themeClass={theme.textMain}>
          {t.players}
        </ScreenTitle>
        <span className={`${typographyClass.label} tracking-wide text-ui-fg-muted`}>
          {players.length}/{MAX_PLAYERS}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
        {players.map((p) => {
          const online = isPlayerSocketConnected(p);
          const justJoined = recentlyJoinedIds.has(p.id);
          const showKickMenu = isHost && !p.isHost && p.id !== myPlayerId;
          const kickMenuOpen = kickMenuPlayerId === p.id;

          return (
            <div
              key={p.id}
              className={`relative shrink-0 flex flex-col items-center gap-1.5 ${
                justJoined ? 'motion-safe:animate-fade-in' : ''
              }`}
            >
              <div className="relative">
                {p.avatarId != null ? (
                  <AvatarDisplay avatarId={p.avatarId} size={44} />
                ) : (
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-ui-border bg-ui-surface text-2xl ${
                      !online ? 'text-ui-fg-muted' : ''
                    }`}
                  >
                    {p.avatar}
                  </span>
                )}
                <span
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-ui-bg ${
                    online ? 'bg-ui-success' : 'bg-ui-warning'
                  }`}
                  title={online ? t.playerOnlineHint : t.playerDisconnected}
                  aria-hidden
                />
                {p.isHost && (
                  <span
                    className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-ui-surface border border-ui-border"
                    aria-label="Host"
                  >
                    <Crown
                      size={10}
                      className="text-[color-mix(in_srgb,var(--ui-accent)_65%,var(--ui-warning)_35%)]"
                      aria-hidden
                    />
                  </span>
                )}
              </div>

              <span
                className={`max-w-[56px] truncate ${typographyClass.label} tracking-wide ${theme.textMain}`}
              >
                {p.name}
              </span>

              {showKickMenu && (
                <div className="relative">
                  {kickMenuOpen ? (
                    <button
                      type="button"
                      onClick={() => {
                        setKickMenuPlayerId(null);
                        onKick({ id: p.id, name: p.name });
                      }}
                      className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--ui-danger)_16%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] transition-all duration-200 active:scale-95"
                      title={t.kickPlayerTitle}
                      aria-label={t.kickPlayerTitle}
                    >
                      <X size={14} className="text-ui-danger" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setKickMenuPlayerId((cur) => (cur === p.id ? null : p.id))}
                      className="min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all duration-200 active:scale-95"
                      title={t.more}
                      aria-label={t.more}
                      aria-expanded={kickMenuOpen}
                    >
                      <MoreHorizontal size={14} className={`${theme.iconColor} text-ui-fg-muted`} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
