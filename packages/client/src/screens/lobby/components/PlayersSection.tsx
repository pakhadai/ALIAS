import React from 'react';
import { Crown, Minus, MoreHorizontal, Plus, X } from 'lucide-react';
import type { Player, ThemeConfig } from '../../../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { MAX_PLAYERS, TRANSLATIONS } from '../../../constants';

type T = (typeof TRANSLATIONS)['EN'];

export function PlayersSection(props: {
  theme: ThemeConfig;
  t: T;
  players: Player[];
  gameMode: 'ONLINE' | 'OFFLINE';
  isHost: boolean;
  myPlayerId: string;
  recentlyJoinedIds: Set<string>;
  kickMenuPlayerId: string | null;
  setKickMenuPlayerId: (v: string | null | ((cur: string | null) => string | null)) => void;
  onKick: (p: { id: string; name: string }) => void;
  onRemoveOffline: (id: string) => void;
  canAddOfflinePlayer: boolean;
  onAddOfflineClick: () => void;
}): React.ReactNode {
  const {
    theme,
    t,
    players,
    gameMode,
    isHost,
    myPlayerId,
    recentlyJoinedIds,
    kickMenuPlayerId,
    setKickMenuPlayerId,
    onKick,
    onRemoveOffline,
    canAddOfflinePlayer,
    onAddOfflineClick,
  } = props;

  const isPlayerSocketConnected = (p: { isConnected?: boolean }) => p.isConnected !== false;

  return (
    <div className="w-full max-w-sm space-y-6">
      <h3 className={`font-serif text-xl ${theme.textMain}`}>
        {t.players} ({players.length})
      </h3>

      <div className="space-y-3">
        {players.map((p) => {
          const online = gameMode === 'OFFLINE' || isPlayerSocketConnected(p);
          const justJoined = recentlyJoinedIds.has(p.id);

          return (
            <div
              key={p.id}
              className={`flex items-center p-4 rounded-2xl border transition-opacity ${
                theme.isDark ? 'bg-(--ui-surface) border-(--ui-border)' : 'bg-(--ui-card) border-(--ui-border)'
              } ${
                !online ? 'opacity-75 border-[color-mix(in_srgb,var(--ui-warning)_35%,transparent)]' : ''
              } ${justJoined ? 'animate-fade-in' : ''}`}
            >
              {p.avatarId != null ? <AvatarDisplay avatarId={p.avatarId} size={36} /> : <span className="text-2xl">{p.avatar}</span>}

              <div className="ml-4 flex flex-col min-w-0 flex-1">
                <span className={`font-bold truncate ${theme.textMain} inline-flex items-center gap-2`}>
                  {p.name}
                  {p.isHost && (
                    <Crown
                      size={14}
                      className="text-[color-mix(in_srgb,var(--ui-accent)_80%,#FFD54A_20%)]"
                      aria-label="Host"
                    />
                  )}
                </span>

                {gameMode === 'ONLINE' && !online && (
                  <span className={`text-[9px] uppercase tracking-widest font-bold mt-0.5 ${theme.textSecondary}`}>
                    {t.playerDisconnected}
                  </span>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2 shrink-0">
                {isHost && !p.isHost && p.id !== myPlayerId && gameMode === 'ONLINE' && (
                  <div className="relative">
                    {kickMenuPlayerId === p.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setKickMenuPlayerId(null);
                          onKick({ id: p.id, name: p.name });
                        }}
                        className="p-1.5 rounded-lg bg-[color-mix(in_srgb,var(--ui-danger)_16%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] transition-colors group"
                        title={t.kickPlayerTitle}
                        aria-label={t.kickPlayerTitle ?? 'Kick player'}
                      >
                        <X size={14} className="text-(--ui-danger) opacity-90 group-hover:opacity-100" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setKickMenuPlayerId((cur) => (cur === p.id ? null : p.id))}
                        className="p-1.5 rounded-lg hover:bg-(--ui-surface-hover) border border-(--ui-border) transition-colors"
                        title={t.more ?? 'More'}
                        aria-label={t.more ?? 'More'}
                      >
                        <MoreHorizontal size={14} className={`${theme.iconColor} opacity-60`} />
                      </button>
                    )}
                  </div>
                )}

                {isHost && gameMode === 'OFFLINE' && !p.isHost && (
                  <button
                    type="button"
                    onClick={() => onRemoveOffline(p.id)}
                    className="p-1.5 rounded-lg hover:bg-[color-mix(in_srgb,var(--ui-danger)_16%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] transition-colors group"
                    aria-label={t.removePlayer ?? 'Remove player'}
                  >
                    <Minus size={14} className="text-(--ui-danger) opacity-80 group-hover:opacity-100" />
                  </button>
                )}

                {gameMode === 'ONLINE' && online && (
                  <div
                    className="w-3.5 h-3.5 rounded-full bg-(--ui-success) shadow-[0_0_6px_color-mix(in_srgb,var(--ui-success)_60%,transparent)]"
                    title={t.playerOnlineHint}
                  />
                )}
                {gameMode === 'ONLINE' && !online && (
                  <div
                    className="w-3.5 h-3.5 rounded-full bg-(--ui-warning) shadow-[0_0_6px_color-mix(in_srgb,var(--ui-warning)_60%,transparent)] animate-pulse"
                    title={t.playerDisconnected}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isHost && gameMode === 'OFFLINE' && (
        <button
          onClick={onAddOfflineClick}
          disabled={!canAddOfflinePlayer}
          className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-dashed transition-all ${
            theme.isDark
              ? 'border-(--ui-border) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:border-(--ui-border)'
              : 'border-(--ui-border) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:border-(--ui-border)'
          }`}
        >
          <span className="inline-flex items-center gap-3">
            <Plus size={18} />
            <span className="text-[10px] uppercase tracking-widest font-bold">
              {players.length >= MAX_PLAYERS
                ? `${t.addPlayer} (${players.length}/${MAX_PLAYERS})`
                : t.addPlayer}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

