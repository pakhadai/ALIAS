import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackNavigationGuardProvider } from '../../../context/BackNavigationGuardContext';
import { PreRoundScreen } from './PreRoundScreen';
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

vi.mock('../../../hooks/useTelegramApp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../hooks/useTelegramApp')>();
  return {
    ...actual,
    hasTelegramInitData: () => false,
  };
});

function renderPreRound() {
  return render(
    <BackNavigationGuardProvider>
      <PreRoundScreen />
    </BackNavigationGuardProvider>
  );
}

describe('PreRoundScreen', () => {
  beforeEach(() => {
    resetGameFlowMocks();
  });

  it('should show ready CTA when local player is the explainer', () => {
    gameFlowMockRefs.myPlayerId = 'h1';
    gameFlowMockRefs.gameMode = 'ONLINE';

    renderPreRound();

    expect(screen.getByRole('button', { name: gameFlowMockT.takePhone })).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(gameFlowMockT.explains)).toBeInTheDocument();
  });

  it('should show wait copy when online guesser is not the explainer', () => {
    gameFlowMockRefs.myPlayerId = 'p2';
    gameFlowMockRefs.gameMode = 'ONLINE';

    renderPreRound();

    expect(screen.queryByRole('button', { name: gameFlowMockT.takePhone })).not.toBeInTheDocument();
    expect(screen.getByText(gameFlowMockT.waitAdmin)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should call handleStartRound when explainer taps ready', async () => {
    gameFlowMockRefs.myPlayerId = 'h1';
    const user = userEvent.setup();

    renderPreRound();
    await user.click(screen.getByRole('button', { name: gameFlowMockT.takePhone }));

    expect(gameFlowActionMocks.handleStartRound).toHaveBeenCalledTimes(1);
  });
});
