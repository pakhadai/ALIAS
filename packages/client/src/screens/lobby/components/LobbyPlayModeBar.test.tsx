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
  lobbyPlayMode: 'Play format',
  teamMode: 'Team mode',
  teamModeSolo: 'Solo',
  teamModeTeams: 'Teams',
  teamModeSoloHint: 'Solo hint',
  teamCount: 'Team count',
  lobbyAddTeam: 'Add team',
  lobbyRemoveTeam: 'Remove team',
  lobbyTeamAssignHint: 'Pick a team below',
  lobbyRandomTeams: 'Random shuffle',
  shuffle: 'Shuffle',
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

    expect(screen.getByText('Solo hint')).toBeTruthy();
    expect(screen.queryByText('Random shuffle')).toBeNull();
    expect(screen.queryByText('Add team')).toBeNull();
  });
});
