import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamSetupScreen } from './TeamSetupScreen';
import { GameMode } from '../../types';
import { Language } from '@alias/shared';

const setGameState = vi.fn();
const sendAction = vi.fn();
const setTeams = vi.fn();

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    teams: [],
    settings: {
      general: {
        language: Language.UA,
        teamCount: 2,
        teamMode: 'TEAMS' as const,
        categories: [],
        scoreToWin: 30,
        skipPenalty: false,
      },
      mode: { gameMode: GameMode.CLASSIC, classicRoundTime: 60 },
    },
    currentTheme: {
      bg: 'bg-test',
      card: '',
      textMain: 'text-main',
      textSecondary: 'text-secondary',
      button: 'btn',
      iconColor: 'icon',
      isDark: true,
    },
    sendAction,
    setGameState,
    isHost: true,
    gameMode: 'OFFLINE' as const,
    setTeams,
  }),
}));

vi.mock('../../hooks/useT', () => ({
  useT: () => ({
    teams: 'Teams',
    backToLobby: 'Back',
    renameTeam: 'Rename',
    shuffleTeams: 'Shuffle',
    startGame: 'Start',
    teamSetupMoveHere: 'Move here',
    teamSetupTapHint: 'Tap a player',
  }),
}));

describe('TeamSetupScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render virtual team shells when teams array is empty', () => {
    render(<TeamSetupScreen />);

    expect(screen.getByText('Ракети')).toBeTruthy();
    expect(screen.getByText('Ніндзя')).toBeTruthy();
    expect(screen.getAllByText('(0)')).toHaveLength(2);
  });
});
