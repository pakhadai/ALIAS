import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoreboardScreen } from './ScoreboardScreen';
import {
  buildMockGame,
  gameFlowActionMocks,
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

describe('ScoreboardScreen', () => {
  beforeEach(() => {
    resetGameFlowMocks();
  });

  it('should render team scores from game state', () => {
    render(<ScoreboardScreen />);

    expect(screen.getByText('Red Team')).toBeInTheDocument();
    expect(screen.getByText('Blue Team')).toBeInTheDocument();
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(screen.getByText(`${gameFlowMockT.goal}: 30`)).toBeInTheDocument();
  });

  it('should show next round CTA for host', async () => {
    gameFlowMockRefs.isHost = true;
    const user = userEvent.setup();

    render(<ScoreboardScreen />);

    const nextRoundButton = screen.getByRole('button', { name: gameFlowMockT.nextRound });
    expect(nextRoundButton).toBeInTheDocument();

    await user.click(nextRoundButton);
    expect(gameFlowActionMocks.handleNextRound).toHaveBeenCalledTimes(1);
  });

  it('should show wait copy for non-host players', () => {
    gameFlowMockRefs.isHost = false;

    render(<ScoreboardScreen />);

    expect(screen.queryByRole('button', { name: gameFlowMockT.nextRound })).not.toBeInTheDocument();
    expect(screen.getByText(gameFlowMockT.waitAdmin)).toBeInTheDocument();
  });
});
