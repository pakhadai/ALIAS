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
  it('should render opaque blocked button with lock and no validation line above', () => {
    render(<LobbyStartPanel readiness={blocked} t={t} theme={theme} onStartTap={vi.fn()} />);

    expect(screen.getByTestId('lobby-start-panel')).toBeTruthy();
    expect(screen.queryByTestId('lobby-readiness-bar')).toBeNull();
    const startBtn = screen.getByTestId('lobby-start-btn');
    expect(startBtn).toHaveAttribute('aria-disabled', 'true');
    expect(startBtn).not.toBeDisabled();
    expect(startBtn).toHaveClass('lobby-start-btn--blocked');
    expect(startBtn.querySelector('svg')).toBeTruthy();
  });

  it('should add neon snake shell when lobby is ready', () => {
    render(<LobbyStartPanel readiness={ready} t={t} theme={theme} onStartTap={vi.fn()} />);

    expect(screen.getByTestId('lobby-start-btn-shell')).toHaveClass('lobby-start-btn-shell--ready');
    expect(screen.getByTestId('lobby-start-btn')).toHaveClass('lobby-start-btn--ready');
    expect(screen.getByTestId('lobby-start-btn').querySelector('svg')).toBeNull();
  });

  it('should mark shell as blocked when lobby is not ready', () => {
    render(<LobbyStartPanel readiness={blocked} t={t} theme={theme} onStartTap={vi.fn()} />);

    expect(screen.getByTestId('lobby-start-btn-shell')).toHaveClass(
      'lobby-start-btn-shell--blocked'
    );
    expect(screen.getByTestId('lobby-start-btn-shell')).not.toHaveClass(
      'lobby-start-btn-shell--ready'
    );
  });

  it('should call onStartTap when host taps ready start button', async () => {
    const user = userEvent.setup();
    const onStartTap = vi.fn();

    render(<LobbyStartPanel readiness={ready} t={t} theme={theme} onStartTap={onStartTap} />);

    await user.click(screen.getByTestId('lobby-start-btn'));
    expect(onStartTap).toHaveBeenCalledOnce();
  });

  it('should call onStartTap when host taps blocked button for hint toast', async () => {
    const user = userEvent.setup();
    const onStartTap = vi.fn();

    render(<LobbyStartPanel readiness={blocked} t={t} theme={theme} onStartTap={onStartTap} />);

    await user.click(screen.getByTestId('lobby-start-btn'));
    expect(onStartTap).toHaveBeenCalledOnce();
  });
});
