import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LobbyStartPanel } from './LobbyStartPanel';
import type { LobbyReadiness } from '../deriveLobbyReadiness';
import type { TranslationStrings } from '../../../hooks/useT';
import type { ThemeConfig } from '../../../types';

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
  startGame: 'Start game',
  lobbyReadinessReady: 'Ready',
  lobbyStartMinPlayers: 'Need 2 players',
} as TranslationStrings;

const ready: LobbyReadiness = {
  ok: true,
  firstBlockingReason: '',
  hasOverfilledTeams: false,
  items: [],
};

const blocked: LobbyReadiness = {
  ok: false,
  firstBlockingReason: 'Need 2 players',
  hasOverfilledTeams: false,
  items: [],
};

describe('LobbyStartPanel', () => {
  it('should render glass panel with validation message and start button', () => {
    render(<LobbyStartPanel readiness={blocked} t={t} theme={theme} onStartTap={vi.fn()} />);

    expect(screen.getByTestId('lobby-start-panel')).toBeTruthy();
    expect(screen.getByTestId('lobby-start-validation')).toHaveTextContent('Need 2 players');
    expect(screen.getByRole('button', { name: 'Start game' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('should add comet ring shell when lobby is ready', () => {
    render(<LobbyStartPanel readiness={ready} t={t} theme={theme} onStartTap={vi.fn()} />);

    expect(screen.getByTestId('lobby-start-btn-shell')).toHaveClass('lobby-start-btn-shell--ready');
  });

  it('should not add comet ring shell when lobby is blocked', () => {
    render(<LobbyStartPanel readiness={blocked} t={t} theme={theme} onStartTap={vi.fn()} />);

    expect(screen.getByTestId('lobby-start-btn-shell')).not.toHaveClass(
      'lobby-start-btn-shell--ready'
    );
  });

  it('should call onStartTap when host taps start', async () => {
    const user = userEvent.setup();
    const onStartTap = vi.fn();

    render(<LobbyStartPanel readiness={ready} t={t} theme={theme} onStartTap={onStartTap} />);

    await user.click(screen.getByRole('button', { name: 'Start game' }));
    expect(onStartTap).toHaveBeenCalledOnce();
  });
});
