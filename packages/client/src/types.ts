// Re-export shared types and enums
export {
  GameState, Language, Category, AppTheme, SoundPreset,
} from '@alias/shared';

export type {
  Player, Team, GameSettings, RoundStats,
  GameActionPayload, NetworkMessage, GameActionType, NetworkActionType,
} from '@alias/shared';

import type { GameState, AppTheme } from '@alias/shared';
import type { Player, Team, GameSettings, RoundStats, GameActionPayload } from '@alias/shared';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  bg: string;
  card: string;
  textMain: string;
  textSecondary: string;
  textAccent: string;
  textGradient: string;
  button: string;
  iconColor: string;
  progressBar: string;
  isPremium?: boolean;
}

export interface AppState {
  gameState: GameState;
  gameMode: 'ONLINE' | 'OFFLINE';
  settings: GameSettings;
  roomCode: string;
  isHost: boolean;
  myPlayerId: string;
  players: Player[];
  teams: Team[];
  currentTeamIndex: number;
  wordDeck: string[];
  currentWord: string;
  currentRoundStats: RoundStats;
  timeLeft: number;
  isPaused: boolean;
  isConnected: boolean;
  notification: { message: string, type: 'info' | 'error' | 'success' } | null;
  connectionError: string | null;
}

export interface GameContextType extends AppState {
  currentTheme: ThemeConfig;
  setGameState: (state: GameState) => void;
  createNewRoom: () => void;
  handleJoin: (id: string, name: string, avatar: string) => void;
  sendAction: (action: GameActionPayload) => void;
  playSound: (soundId: string) => void;
  showNotification: (message: string, type?: 'info' | 'error' | 'success') => void;
  setSettings: (settings: GameSettings | ((prev: GameSettings) => GameSettings)) => void;
  startOfflineGame: () => void;
  handleCorrect: () => void;
  handleSkip: () => void;
  handleStartRound: () => void;
  startGameplay: () => void;
  handleNextRound: () => void;
  togglePause: () => void;
  setTimeLeft: (value: number | ((prev: number) => number)) => void;
  setTeams: (teams: Team[]) => void;
  resetGame: () => void;
  rematch: () => void;
  setRoomCode: (code: string) => void;
  addOfflinePlayer: (name?: string, avatar?: string) => void;
  removeOfflinePlayer: (id: string) => void;
}

