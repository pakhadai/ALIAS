import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinInputScreen } from './JoinInputScreen';
import { GameState } from '../../types';

const setGameState = vi.fn();
const setRoomCode = vi.fn();
const checkRoomExists = vi.fn<(roomCode: string) => Promise<boolean>>();
const showNotification = vi.fn();

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    setGameState,
    settings: {},
    currentTheme: { bg: '', card: '', textMain: '', button: '', iconColor: '', isDark: true },
    setRoomCode,
    checkRoomExists,
    showNotification,
  }),
}));

vi.mock('../../hooks/useT', () => ({
  useT: () => ({
    joinTitle: 'Join',
    enterCode: 'Enter code',
    enter: 'Enter',
    cancel: 'Cancel',
    connecting: 'Connecting',
    roomNotFound: 'Room {0} not found',
  }),
}));

describe('JoinInputScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps only digits and enforces max length', async () => {
    const user = userEvent.setup();
    render(<JoinInputScreen />);

    const input = screen.getByPlaceholderText('00000') as HTMLInputElement;
    await user.type(input, '12a 3-4_5_6');
    expect(input.value).toBe('12345');
  });

  it('shows notification when room does not exist', async () => {
    const user = userEvent.setup();
    checkRoomExists.mockResolvedValueOnce(false);
    render(<JoinInputScreen />);

    const input = screen.getByPlaceholderText('00000') as HTMLInputElement;
    await user.type(input, '12345');

    await user.click(screen.getByRole('button', { name: 'Enter' }));

    expect(checkRoomExists).toHaveBeenCalledWith('12345');
    expect(showNotification).toHaveBeenCalledWith('Room 12345 not found', 'error');
    expect(setRoomCode).not.toHaveBeenCalled();
    expect(setGameState).not.toHaveBeenCalledWith(GameState.ENTER_NAME);
  });

  it('sets room code and navigates to enter name when room exists', async () => {
    const user = userEvent.setup();
    checkRoomExists.mockResolvedValueOnce(true);
    render(<JoinInputScreen />);

    const input = screen.getByPlaceholderText('00000') as HTMLInputElement;
    await user.type(input, '12345');

    await user.click(screen.getByRole('button', { name: 'Enter' }));

    expect(checkRoomExists).toHaveBeenCalledWith('12345');
    expect(setRoomCode).toHaveBeenCalledWith('12345');
    expect(setGameState).toHaveBeenCalledWith(GameState.ENTER_NAME);
  });
});
