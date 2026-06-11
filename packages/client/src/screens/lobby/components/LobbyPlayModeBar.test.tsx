import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LobbyPlayModeBar } from './LobbyPlayModeBar';

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
  lobbyPlayMode: 'How we play',
  teamModeSolo: 'Solo',
  teamModeTeams: 'Teams',
  lobbyTeamsCount: '{0} teams',
} as TranslationStrings;

describe('LobbyPlayModeBar', () => {
  const onTeamModeChange = vi.fn();
  const onTeamCountChange = vi.fn();
  const onShuffleUnassigned = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onTeamModeChange with SOLO when host taps solo segment', async () => {
    const user = userEvent.setup();

    render(
      <LobbyPlayModeBar
        theme={theme}
        t={t}
        isHost
        isSolo={false}
        teamCount={2}
        onTeamModeChange={onTeamModeChange}
        onTeamCountChange={onTeamCountChange}
        onShuffleUnassigned={onShuffleUnassigned}
        shuffleDisabled={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Solo' }));
    expect(onTeamModeChange).toHaveBeenCalledWith('SOLO');
  });

  it('should render only the mode toggle for host in teams mode', () => {
    render(
      <LobbyPlayModeBar
        theme={theme}
        t={t}
        isHost
        isSolo={false}
        teamCount={2}
        onTeamModeChange={onTeamModeChange}
        onTeamCountChange={onTeamCountChange}
        onShuffleUnassigned={onShuffleUnassigned}
        shuffleDisabled={false}
      />
    );

    expect(screen.getByText('How we play')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Solo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Teams' })).toBeTruthy();
    expect(screen.queryByText('Random shuffle')).toBeNull();
  });

  it('should hide team controls when solo is active', () => {
    render(
      <LobbyPlayModeBar
        theme={theme}
        t={t}
        isHost
        isSolo
        teamCount={2}
        onTeamModeChange={onTeamModeChange}
        onTeamCountChange={onTeamCountChange}
        onShuffleUnassigned={onShuffleUnassigned}
        shuffleDisabled
      />
    );

    expect(screen.getByRole('button', { name: 'Solo' })).toBeTruthy();
    expect(screen.queryByText('Random shuffle')).toBeNull();
  });

  it('should show guest play format without toggle', () => {
    render(
      <LobbyPlayModeBar
        theme={theme}
        t={t}
        isHost={false}
        isSolo={false}
        teamCount={3}
        onTeamModeChange={onTeamModeChange}
        onTeamCountChange={onTeamCountChange}
        onShuffleUnassigned={onShuffleUnassigned}
        shuffleDisabled
      />
    );

    expect(screen.getByText('3 teams')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Solo' })).toBeNull();
  });
});
