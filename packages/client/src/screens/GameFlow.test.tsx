import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameFlow } from './GameFlow';
import { GameMode, GameState } from '../types';

let mockGameState = GameState.PRE_ROUND;
let mockGameMode = GameMode.CLASSIC;

vi.mock('../context/GameContext', () => ({
  useGame: () => ({
    gameState: mockGameState,
    settings: {
      general: {},
      mode: { gameMode: mockGameMode, classicRoundTime: 60 },
    },
  }),
}));

vi.mock('./GameFlow/screens', () => ({
  VSScreen: () => <div data-testid="screen-vs">VS</div>,
  PreRoundScreen: () => <div data-testid="screen-pre-round">PreRound</div>,
  CountdownScreen: () => <div data-testid="screen-countdown">Countdown</div>,
  PlayingScreen: () => <div data-testid="screen-playing">Playing</div>,
  ImposterScreen: () => <div data-testid="screen-imposter">Imposter</div>,
  RoundSummaryScreen: () => <div data-testid="screen-round-summary">RoundSummary</div>,
  ScoreboardScreen: () => <div data-testid="screen-scoreboard">Scoreboard</div>,
  GameOverScreen: () => <div data-testid="screen-game-over">GameOver</div>,
}));

const imposterRoundStates = [GameState.PRE_ROUND, GameState.COUNTDOWN, GameState.PLAYING] as const;

const gameFlowCases: {
  state: GameState;
  mode: GameMode;
  testId: string;
}[] = [
  { state: GameState.VS_SCREEN, mode: GameMode.CLASSIC, testId: 'screen-vs' },
  { state: GameState.PRE_ROUND, mode: GameMode.CLASSIC, testId: 'screen-pre-round' },
  { state: GameState.COUNTDOWN, mode: GameMode.CLASSIC, testId: 'screen-countdown' },
  { state: GameState.PLAYING, mode: GameMode.CLASSIC, testId: 'screen-playing' },
  ...imposterRoundStates.map((state) => ({
    state,
    mode: GameMode.IMPOSTER,
    testId: 'screen-imposter' as const,
  })),
  { state: GameState.ROUND_SUMMARY, mode: GameMode.CLASSIC, testId: 'screen-round-summary' },
  { state: GameState.SCOREBOARD, mode: GameMode.CLASSIC, testId: 'screen-scoreboard' },
  { state: GameState.GAME_OVER, mode: GameMode.CLASSIC, testId: 'screen-game-over' },
];

describe('GameFlow router', () => {
  beforeEach(() => {
    mockGameState = GameState.PRE_ROUND;
    mockGameMode = GameMode.CLASSIC;
  });

  it.each(gameFlowCases)(
    'should render $testId when gameState is $state and mode is $mode',
    ({ state, mode, testId }) => {
      mockGameState = state;
      mockGameMode = mode;
      render(<GameFlow />);
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
  );

  it('should render nothing for non-game-flow states', () => {
    mockGameState = GameState.LOBBY;
    const { container } = render(<GameFlow />);
    expect(container).toBeEmptyDOMElement();
  });
});
