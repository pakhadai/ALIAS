import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountdownScreen } from './CountdownScreen';
import {
  buildMockGame,
  gameFlowActionMocks,
  gameFlowMockRefs,
  resetGameFlowMocks,
} from '../test/gameFlowFixtures';

vi.mock('../../../context/GameContext', () => ({
  useGame: () => buildMockGame(),
}));

describe('CountdownScreen', () => {
  beforeEach(() => {
    resetGameFlowMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render the initial countdown number', () => {
    render(<CountdownScreen />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show GO and starting label for explainer after countdown', () => {
    gameFlowMockRefs.myPlayerId = 'h1';

    render(<CountdownScreen />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('GO')).toBeInTheDocument();
    expect(screen.getByText('Starting…')).toBeInTheDocument();
    expect(gameFlowActionMocks.startGameplay).toHaveBeenCalledTimes(1);
  });

  it('should show waiting label for online guesser after countdown', () => {
    gameFlowMockRefs.myPlayerId = 'p2';
    gameFlowMockRefs.gameMode = 'ONLINE';

    render(<CountdownScreen />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('GO')).toBeInTheDocument();
    expect(screen.getByText('Waiting…')).toBeInTheDocument();
    expect(gameFlowActionMocks.startGameplay).not.toHaveBeenCalled();
  });
});
