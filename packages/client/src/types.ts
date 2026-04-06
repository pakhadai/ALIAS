// Re-export shared types and enums
export { GameState, Language, Category, AppTheme, SoundPreset, GameMode } from '@alias/shared';

export type {
  Player,
  Team,
  GameSettings,
  GameTask,
  RoundStats,
  GameActionPayload,
  NetworkMessage,
  GameActionType,
  NetworkActionType,
  RoomErrorCode,
} from '@alias/shared';

/** In-game UI sound keys (see `playSoundEffect` in utils/audio) */
export type GameSoundId = 'correct' | 'skip' | 'start' | 'end' | 'tick' | 'win' | 'click';

import type {
  GameState,
  AppTheme,
  RoomErrorCode,
  Player,
  Team,
  GameSettings,
  GameTask,
  RoundStats,
  GameActionPayload,
} from '@alias/shared';

export type ImposterPhase = 'REVEAL' | 'DISCUSSION' | 'RESULTS';

export type ImposterSecret = { isImposter: boolean; word: string | null };

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  description: string;
  isFree: boolean;
  isDark: boolean;
  preview: { bg: string; accent: string };
  /** Core semantic token colors used to set `--ui-*` variables. */
  tokens?: {
    bg: string;
    surface: string;
    border: string;
    accent: string;
    fgMuted: string;
    fg: string;
  };
  fonts: { heading: string; body: string };
  borderRadius: string;
  bg: string;
  card: string;
  textMain: string;
  textSecondary: string;
  textAccent: string;
  textGradient: string;
  button: string;
  iconColor: string;
  progressBar: string;
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
  currentTask: GameTask | null;
  currentRoundStats: RoundStats;
  timeLeft: number;
  isPaused: boolean;
  timeUp?: boolean;
  isConnected: boolean;
  notification: { message: string; type: 'info' | 'error' | 'success' } | null;
  connectionError: string | null;
  connectionErrorCode: RoomErrorCode | null;

  // IMPOSTER mode runtime state (online sync + offline pass&play)
  imposterPhase?: ImposterPhase;
  imposterPlayerId?: string;
  revealedPlayerIds: string[];
  imposterSecret: ImposterSecret | null;
  /** Offline pass&play: whose turn to reveal. */
  imposterOfflineRevealIndex: number;
  /** Offline only: stored secret word to show in RESULTS. */
  imposterWord: string | null;
}

export interface GameContextType extends AppState {
  /** From socket layer: room:rejoin in flight after connect. */
  isReconnecting: boolean;
  currentTheme: ThemeConfig;
  setGameState: (state: GameState) => void;
  createNewRoom: () => void;
  handleJoin: (id: string, name: string, avatar: string, avatarId?: string | null) => void;
  sendAction: (action: GameActionPayload) => void;
  playSound: (soundId: GameSoundId) => void;
  showNotification: (message: string, type?: 'info' | 'error' | 'success') => void;
  /** Checks if an online room code exists (before entering name). */
  checkRoomExists: (roomCode: string) => Promise<boolean>;
  setSettings: (settings: GameSettings | ((prev: GameSettings) => GameSettings)) => void;
  /** Update device-only preferences without syncing to server. */
  setPreferences: (patch: Partial<GameSettings['general']>) => void;
  startOfflineGame: () => void;
  handleCorrect: () => void;
  handleSkip: () => void;
  sendGuessOption: (selectedOption: string) => void;
  handleStartRound: () => void;
  startGameplay: () => void;
  handleNextRound: () => void;
  togglePause: () => void;
  setTimeLeft: (value: number | ((prev: number) => number)) => void;
  setTeams: (teams: Team[]) => void;
  resetGame: () => void;
  rematch: () => void;
  leaveRoom: () => void;
  setRoomCode: (code: string) => void;
  addOfflinePlayer: (name?: string, avatar?: string) => void;
  removeOfflinePlayer: (id: string) => void;
}
