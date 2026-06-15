import React from 'react';
import { Crown, Minus, MoreHorizontal, Plus, X } from 'lucide-react';
import type { Player, ThemeConfig } from '../../../types';
import { PlayerAvatar } from '../../../components/AvatarDisplay';
import { Button } from '../../../components/Button';
import { MAX_PLAYERS } from '../../../constants';
import type { TranslationStrings } from '../../../hooks/useT';
import { ScreenTitle } from '../../../components/typography/ScreenTitle';
import { typographyClass } from '../../../constants/typography';

type T = TranslationStrings;

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
    <div className="w-full max-w-sm space-y-6" data-testid="lobby-players-section">
      <ScreenTitle as="h3">
        {t.players} ({players.length})
      </ScreenTitle>

      <div className="space-y-3">
        {players.map((p) => {
          const online = gameMode === 'OFFLINE' || isPlayerSocketConnected(p);
          const justJoined = recentlyJoinedIds.has(p.id);

          return (
            <div
              key={p.id}
              className={`flex items-center p-4 rounded-2xl border transition-opacity ${
                theme.isDark ? 'bg-ui-surface border-ui-border' : 'bg-ui-card border-ui-border'
              } ${
                !online
                  ? 'border-[color-mix(in_srgb,var(--ui-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--ui-warning)_8%,var(--ui-surface))]'
                  : ''
              } ${justJoined ? 'motion-safe:animate-fade-in' : ''}`}
            >
              <PlayerAvatar player={p} size={36} emojiClassName="text-2xl" />

              <div className="ml-4 flex flex-col min-w-0 flex-1">
                <span
                  className={`font-bold truncate text-ui-fg inline-flex items-center gap-2 ${typographyClass.body}`}
                >
                  {p.name}
                  {p.isHost && (
                    <Crown
                      size={14}
                      className="text-[color-mix(in_srgb,var(--ui-accent)_65%,var(--ui-warning)_35%)]"
                      aria-label={t.roomOrganizer}
                    />
                  )}
                </span>
              </div>

              <div className="ml-auto flex items-center gap-2 shrink-0">
                {isHost && !p.isHost && p.id !== myPlayerId && gameMode === 'ONLINE' && (
                  <div className="relative">
                    {kickMenuPlayerId === p.id ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setKickMenuPlayerId(null);
                          onKick({ id: p.id, name: p.name });
                        }}
                        className="min-h-11 min-w-11 px-0"
                        title={t.kickPlayerTitle}
                        aria-label={t.kickPlayerTitle}
                      >
                        <X size={14} aria-hidden />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setKickMenuPlayerId((cur) => (cur === p.id ? null : p.id))}
                        className="min-h-11 min-w-11 px-0"
                        title={t.more ?? 'More'}
                        aria-label={t.more ?? 'More'}
                        aria-expanded={kickMenuPlayerId === p.id}
                      >
                        <MoreHorizontal
                          size={14}
                          className={`${theme.iconColor} text-ui-fg-muted`}
                          aria-hidden
                        />
                      </Button>
                    )}
                  </div>
                )}

                {isHost && gameMode === 'OFFLINE' && !p.isHost && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => onRemoveOffline(p.id)}
                    className="min-h-11 min-w-11 px-0"
                    aria-label={t.removePlayer ?? 'Remove player'}
                  >
                    <Minus size={14} aria-hidden />
                  </Button>
                )}

                {gameMode === 'ONLINE' && online && (
                  <span
                    className={`inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--ui-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] px-2 py-0.5 ${typographyClass.label} tracking-wide text-ui-success`}
                    title={t.playerOnlineHint}
                  >
                    {t.playerOnlineHint}
                  </span>
                )}
                {gameMode === 'ONLINE' && !online && (
                  <span
                    className={`inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--ui-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--ui-warning)_12%,transparent)] px-2 py-0.5 ${typographyClass.label} tracking-wide text-ui-warning`}
                    title={t.playerDisconnected}
                  >
                    {t.playerDisconnected}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isHost && gameMode === 'OFFLINE' && (
        <Button
          type="button"
          variant="tertiary"
          size="lg"
          fullWidth
          data-testid="lobby-add-player-trigger"
          onClick={onAddOfflineClick}
          disabled={!canAddOfflinePlayer}
          className="border-dashed font-sans normal-case tracking-normal gap-3"
        >
          <Plus size={18} aria-hidden />
          <span>
            {players.length >= MAX_PLAYERS
              ? `${t.addPlayer} (${players.length}/${MAX_PLAYERS})`
              : t.addPlayer}
          </span>
        </Button>
      )}
    </div>
  );
}
