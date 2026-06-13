import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImposterScreen } from './ImposterScreen';
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

vi.mock('../../../utils/haptics', () => ({
  vibrate: vi.fn(),
}));

describe('ImposterScreen', () => {
  beforeEach(() => {
    resetGameFlowMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should render discussion phase label without leaking secret word in DOM', () => {
    gameFlowMockRefs.imposterPhase = 'DISCUSSION';
    gameFlowMockRefs.imposterSecret = { isImposter: false, word: 'SUPERSECRET_WORD' };
    gameFlowMockRefs.imposterWord = 'SUPERSECRET_WORD';

    render(<ImposterScreen />);

    expect(screen.getByText('Обговорення')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.queryByText('SUPERSECRET_WORD')).not.toBeInTheDocument();
  });

  it('should render reveal imposter label without secret word for imposter role', () => {
    gameFlowMockRefs.imposterPhase = 'REVEAL';
    gameFlowMockRefs.imposterSecret = { isImposter: true, word: 'SUPERSECRET_WORD' };

    render(<ImposterScreen />);
    fireEvent.click(screen.getByTestId('imposter-reveal-cta'));

    expect(screen.getByText('Ти — імпостер')).toBeInTheDocument();
    expect(screen.queryByText('SUPERSECRET_WORD')).not.toBeInTheDocument();
  });

  it('should render loading fallback for unknown phase', () => {
    gameFlowMockRefs.imposterPhase = undefined;

    render(<ImposterScreen />);

    expect(screen.getByText('Завантаження…')).toBeInTheDocument();
  });
});
