import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LobbyAvatarStrip } from './LobbyAvatarStrip';
import type { ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';

const theme = {
  bg: 'bg-test',
  card: '',
  textMain: 'text-main',
  textSecondary: 'text-secondary',
  button: 'btn',
  iconColor: 'icon',
  isDark: true,
} as ThemeConfig;

const t = {
  players: 'Players',
  playerOnlineHint: 'Online',
  playerDisconnected: 'Offline',
  kickPlayerTitle: 'Kick',
  more: 'More',
} as TranslationStrings;

const playerStats = { explained: 0, guessed: 0 };

describe('LobbyAvatarStrip', () => {
  it('should open kick flow when host confirms kick on guest avatar', async () => {
    const user = userEvent.setup();
    const onKick = vi.fn();
    const setKickMenuPlayerId = vi.fn();

    render(
      <LobbyAvatarStrip
        theme={theme}
        t={t}
        players={[
          {
            id: 'h1',
            name: 'Host',
            avatar: '🦊',
            isHost: true,
            isConnected: true,
            stats: playerStats,
          },
          {
            id: 'g1',
            name: 'Guest',
            avatar: '🐺',
            isHost: false,
            isConnected: true,
            stats: playerStats,
          },
        ]}
        isHost
        myPlayerId="h1"
        recentlyJoinedIds={new Set()}
        kickMenuPlayerId="g1"
        setKickMenuPlayerId={setKickMenuPlayerId}
        onKick={onKick}
      />
    );

    await user.click(screen.getByLabelText('Kick'));
    expect(setKickMenuPlayerId).toHaveBeenCalledWith(null);
    expect(onKick).toHaveBeenCalledWith({ id: 'g1', name: 'Guest' });
  });
});
