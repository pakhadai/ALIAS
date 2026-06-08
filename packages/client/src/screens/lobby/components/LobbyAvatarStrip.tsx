import React from 'react';
import { Crown, X } from 'lucide-react';
import type { Player, ThemeConfig } from '../../../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { MAX_PLAYERS } from '../../../constants';
import type { TranslationStrings } from '../../../hooks/useT';
import { ScreenTitle } from '../../../components/typography/ScreenTitle';
import { typographyClass } from '../../../constants/typography';

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
              <div className="relative h-11 w-11">
                <button
                  type="button"
                  data-testid={showKickMenu ? `lobby-avatar-${p.id}` : undefined}
                  disabled={!showKickMenu}
                  onClick={() => {
                    if (!showKickMenu) return;
                    setKickMenuPlayerId((cur) => (cur === p.id ? null : p.id));
                  }}
                  className={`relative h-11 w-11 rounded-full transition-transform duration-200 ${
                    showKickMenu ? 'active:scale-95' : 'cursor-default'
                  }`}
                  aria-label={showKickMenu ? `${p.name}, ${t.more}` : p.name}
                  aria-expanded={showKickMenu ? kickMenuOpen : undefined}
                >
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
                </button>
                <span
                  className={`pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-ui-bg ${
                    online ? 'bg-ui-success' : 'bg-ui-warning'
                  }`}
                  title={online ? t.playerOnlineHint : t.playerDisconnected}
                  aria-hidden
                />
                {p.isHost && (
                  <span
                    className="pointer-events-none absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-ui-surface border border-ui-border"
                    aria-label="Host"
                  >
                    <Crown
                      size={10}
                      className="text-[color-mix(in_srgb,var(--ui-accent)_65%,var(--ui-warning)_35%)]"
                      aria-hidden
                    />
                  </span>
                )}
                {kickMenuOpen && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-full">
                    <button
                      type="button"
                      className="absolute inset-0 rounded-full bg-[color-mix(in_srgb,var(--ui-bg)_45%,var(--ui-danger)_55%)]"
                      onClick={() => setKickMenuPlayerId(null)}
                      aria-label={t.close ?? 'Close'}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setKickMenuPlayerId(null);
                        onKick({ id: p.id, name: p.name });
                      }}
                      className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--ui-danger)_40%,transparent)] bg-ui-surface shadow-sm transition-transform duration-200 active:scale-95"
                      title={t.kickPlayerTitle}
                      aria-label={t.kickPlayerTitle}
                    >
                      <X size={16} className="text-ui-danger" />
                    </button>
                  </div>
                )}
              </div>

              <span
                className={`max-w-[56px] truncate ${typographyClass.label} tracking-wide ${theme.textMain}`}
              >
                {p.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
