import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RoundSummaryScreen } from './RoundSummaryScreen';
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

describe('RoundSummaryScreen', () => {
  beforeEach(() => {
    resetGameFlowMocks();
  });

  it('should render round summary stats and continue CTA for host', () => {
    gameFlowMockRefs.isHost = true;

    render(<RoundSummaryScreen />);

    expect(screen.getByTestId('round-summary')).toBeInTheDocument();
    expect(screen.getByText(gameFlowMockT.timeIsUp)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: gameFlowMockT.continue })).toBeInTheDocument();
  });

  it('should dispatch CONFIRM_ROUND when host confirms results', () => {
    vi.useFakeTimers();
    gameFlowMockRefs.isHost = true;

    render(<RoundSummaryScreen />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: gameFlowMockT.continue }));
    });
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();

    expect(gameFlowActionMocks.sendAction).toHaveBeenCalledWith({ action: 'CONFIRM_ROUND' });
  });

  it('should show wait copy for non-host players', () => {
    gameFlowMockRefs.isHost = false;

    render(<RoundSummaryScreen />);

    expect(screen.queryByRole('button', { name: gameFlowMockT.continue })).not.toBeInTheDocument();
    expect(screen.getByText(gameFlowMockT.waitAdmin)).toBeInTheDocument();
  });
});
