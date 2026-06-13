import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GameState } from './types';

let mockGameState = GameState.MENU;

vi.mock('./pwa-client', () => ({
  setupPwaRegister: vi.fn(),
  applyPwaUpdate: vi.fn(),
}));

vi.mock('./context/GameContext', () => ({
  useGame: () => ({ gameState: mockGameState }),
}));

vi.mock('./screens/MenuFlow', () => ({
  MenuScreen: () => <div data-testid="screen-menu">Menu</div>,
  JoinInputScreen: () => <div data-testid="screen-join-input">Join</div>,
  ProfileScreen: () => <div data-testid="screen-profile">Profile</div>,
  ProfileSettingsScreen: () => <div data-testid="screen-profile-settings">ProfileSettings</div>,
  LobbySettingsScreen: () => <div data-testid="screen-lobby-settings">LobbySettings</div>,
}));

vi.mock('./screens/lobby/LobbyScreen', () => ({
  LobbyScreen: () => <div data-testid="screen-lobby">Lobby</div>,
}));

vi.mock('./screens/lobby/TeamSetupScreen', () => ({
  TeamSetupScreen: () => <div data-testid="screen-teams">Teams</div>,
}));

vi.mock('./screens/lobby/SettingsScreen', () => ({
  SettingsScreen: () => <div data-testid="screen-settings">Settings</div>,
}));

vi.mock('./screens/menu/MyWordPacksScreen', () => ({
  MyWordPacksScreen: () => <div data-testid="screen-my-word-packs">MyWordPacks</div>,
}));

vi.mock('./screens/menu/PlayerStatsScreen', () => ({
  PlayerStatsScreen: () => <div data-testid="screen-player-stats">PlayerStats</div>,
}));

vi.mock('./screens/menu/StoreScreen', () => ({
  StoreScreen: () => <div data-testid="screen-store">Store</div>,
}));

vi.mock('./screens/menu/MyDecksScreen', () => ({
  MyDecksScreen: () => <div data-testid="screen-my-decks">MyDecks</div>,
}));

vi.mock('./screens/menu/RulesScreen', () => ({
  RulesScreen: () => <div data-testid="screen-rules">Rules</div>,
}));

vi.mock('./screens/GameFlow', () => ({
  GameFlow: () => <div data-testid="screen-gameflow">GameFlow</div>,
}));

import { GameRouter } from './App';

const gameFlowStates = [
  GameState.VS_SCREEN,
  GameState.PRE_ROUND,
  GameState.COUNTDOWN,
  GameState.PLAYING,
  GameState.ROUND_SUMMARY,
  GameState.SCOREBOARD,
  GameState.GAME_OVER,
] as const;

const routerCases: { state: GameState; testId: string }[] = [
  { state: GameState.MENU, testId: 'screen-menu' },
  { state: GameState.ENTER_NAME, testId: 'screen-menu' },
  { state: GameState.PROFILE, testId: 'screen-profile' },
  { state: GameState.PROFILE_SETTINGS, testId: 'screen-profile-settings' },
  { state: GameState.LOBBY_SETTINGS, testId: 'screen-lobby-settings' },
  { state: GameState.MY_WORD_PACKS, testId: 'screen-my-word-packs' },
  { state: GameState.PLAYER_STATS, testId: 'screen-player-stats' },
  { state: GameState.STORE, testId: 'screen-store' },
  { state: GameState.MY_DECKS, testId: 'screen-my-decks' },
  { state: GameState.RULES, testId: 'screen-rules' },
  { state: GameState.JOIN_INPUT, testId: 'screen-join-input' },
  { state: GameState.LOBBY, testId: 'screen-lobby' },
  { state: GameState.SETTINGS, testId: 'screen-settings' },
  { state: GameState.TEAMS, testId: 'screen-teams' },
  ...gameFlowStates.map((state) => ({ state, testId: 'screen-gameflow' as const })),
];

describe('GameRouter', () => {
  beforeEach(() => {
    mockGameState = GameState.MENU;
  });

  it.each(routerCases)(
    'should render $testId when gameState is $state',
    async ({ state, testId }) => {
      mockGameState = state;
      render(<GameRouter />);

      await waitFor(() => {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });
    }
  );

  it('should fall back to menu screen for unknown gameState', async () => {
    mockGameState = 'UNKNOWN_STATE' as GameState;
    render(<GameRouter />);

    await waitFor(() => {
      expect(screen.getByTestId('screen-menu')).toBeInTheDocument();
    });
  });
});
