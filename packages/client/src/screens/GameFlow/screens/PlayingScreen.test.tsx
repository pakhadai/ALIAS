import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayingScreen } from './PlayingScreen';
import {
  buildMockGame,
  gameFlowMockRefs,
  gameFlowMockT,
  resetGameFlowMocks,
} from '../test/gameFlowFixtures';

vi.mock('../../../context/GameContext', () => ({
  useGame: () => buildMockGame(),
}));

vi.mock('../../../hooks/useT', () => ({
  useT: () => gameFlowMockT,
}));

vi.mock('../../../hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    impactOccurred: vi.fn(),
    notificationOccurred: vi.fn(),
    pattern: vi.fn(),
    selectionChanged: vi.fn(),
  }),
}));

vi.mock('../../../hooks/usePlayerStats', () => ({
  usePlayerStats: () => ({
    increment: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('PlayingScreen', () => {
  beforeEach(() => {
    resetGameFlowMocks();
  });

  it('should show correct and skip controls for the explainer', () => {
    gameFlowMockRefs.myPlayerId = 'h1';

    render(<PlayingScreen />);

    expect(screen.getByText(gameFlowMockT.correct)).toBeInTheDocument();
    expect(screen.getByText(gameFlowMockT.skip)).toBeInTheDocument();
    expect(screen.getByText('umbrella')).toBeInTheDocument();
  });

  it('should hide action controls and show guesser copy for online non-explainer', () => {
    gameFlowMockRefs.myPlayerId = 'p2';
    gameFlowMockRefs.gameMode = 'ONLINE';

    render(<PlayingScreen />);

    expect(screen.queryByRole('button', { name: gameFlowMockT.correct })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: gameFlowMockT.skip })).not.toBeInTheDocument();
    expect(screen.getByText(gameFlowMockT.youGuess)).toBeInTheDocument();
    expect(screen.queryByText('umbrella')).not.toBeInTheDocument();
  });
});
