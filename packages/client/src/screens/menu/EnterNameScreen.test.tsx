import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnterNameScreen } from './EnterNameScreen';
import { GameState } from '../../types';

const setGameState = vi.fn();
const handleJoin =
  vi.fn<(roomCode: string, playerName: string, avatar: string) => Promise<boolean>>();
const leaveRoom = vi.fn();

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    setGameState,
    settings: {},
    currentTheme: {
      bg: '',
      card: '',
      textMain: '',
      button: '',
      iconColor: '',
      isDark: true,
    },
    handleJoin,
    isHost: false,
    gameMode: 'ONLINE',
    leaveRoom,
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({
    authState: { status: 'anonymous', userId: '', profile: null },
    profile: null,
  }),
}));

vi.mock('../../hooks/useT', () => ({
  useT: () => ({
    whoAreYou: 'Who are you?',
    namePlaceholder: 'Name',
    next: 'Next',
    cancel: 'Cancel',
    enteringRoom: 'Entering…',
  }),
}));

describe('EnterNameScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sanitizes name input (strips HTML, trims, limits to 20) and calls handleJoin', async () => {
    const user = userEvent.setup();
    handleJoin.mockResolvedValueOnce(true);

    render(<EnterNameScreen />);

    const input = screen.getByPlaceholderText('Name') as HTMLInputElement;
    await user.type(input, '<b>Alice</b>' + 'X'.repeat(30));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(handleJoin).toHaveBeenCalledTimes(1);
    const [, nameArg, avatarArg] = handleJoin.mock.calls[0];
    expect(nameArg).toBe('Alice' + 'X'.repeat(15)); // 5 + 15 = 20
    expect(typeof avatarArg).toBe('string');
    expect(setGameState).toHaveBeenCalledWith(GameState.LOBBY);
  });
});
