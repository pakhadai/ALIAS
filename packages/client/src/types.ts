// Re-export shared types and enums
export { GameState, Language, Category, AppTheme, SoundPreset, GameMode } from '@alias/shared';

export type {
  Player,
  Team,
  GameSettings,
  GameTask,
  QuizTaskKind,
  RoundStats,
  GameActionPayload,
  GameActionType,
  NetworkActionType,
  RoomErrorCode,
} from '@alias/shared';

/** In-game UI sound keys (see `playSoundEffect` in utils/audio) */
export type GameSoundId = 'correct' | 'skip' | 'start' | 'end' | 'tick' | 'win' | 'click';

import type {
  GameState,
  AppTheme,
  Language,
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
  /** Optional per-language copy in settings UI; falls back to name/description. */
  labels?: Partial<Record<Language, { name?: string; description?: string }>>;
  isFree: boolean;
  isDark: boolean;
  preview: { bg: string; accent: string };
  /**
   * Five base semantic colors; all other `--ui-*` values are derived in GameContext.
   * Premium multi-accent themes may add at most `accentAlt` + `accentWarm` (see docs/UI_TOKENS.md).
   */
  tokens?: {
    bg: string;
    surface: string;
    fg: string;
    accent: string;
    border: string;
    /** Raised surfaces (modals, nav). Recommended for dark themes; falls back to surface/bg mix. */
    elevated?: string;
    /** Premium exception: secondary accent partner for `--ui-accent-alt`. */
    accentAlt?: string;
    /** Premium exception: warm accent partner for `--ui-accent-warm`. */
    accentWarm?: string;
  };
  fonts: { heading: string; body: string };
  /** Display heading overrides applied via CSS vars on `:root` (see `.font-serif`). */
  heading?: {
    fontWeight?: string;
    textTransform?: string;
    letterSpacing?: string;
  };
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
  /**
   * Personal UI display language — stored locally, never synced to the room.
   * Separate from settings.general.language (word deck language, room-controlled).
   */
  uiLanguage: Language;
  settings: GameSettings;
  roomCode: string;
  isHost: boolean;
  myPlayerId: string;
  players: Player[];
  teams: Team[];
  /** Lobby/team builder: when true, players cannot self-switch teams (host can still edit). */
  teamsLocked?: boolean;
  currentTeamIndex: number;
  wordDeck: string[];
  currentWord: string;
  currentTask: GameTask | null;
  /** QUIZ: playerId who solved currentTask first (server sync). */
  currentTaskAnswered?: string;
  currentRoundStats: RoundStats;
  timeLeft: number;
  /** Server wall-clock ms target for countdown (online); offline may set for drift-free UI. */
  roundEndsAt?: number;
  /** QUIZ (PER_TASK): round seconds remaining (synced online). */
  quizRoundTimeLeft?: number;
  /** QUIZ: ms timestamp until input lock ends (synced online). */
  quizTaskLockUntil?: number;
  /** Session rounds completed (synced online; offline optional). */
  roundsPlayed?: number;
  /** Words used this deck cycle (synced online). */
  usedWords?: string[];
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
  createNewRoom: () => Promise<void>;
  /** Resolves false if validation/local storage failed or room:create|join failed. */
  handleJoin: (
    id: string,
    name: string,
    avatar: string,
    avatarId?: string | null
  ) => Promise<boolean>;
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

/** Split contexts: full app state + socket reconnect flag (high-churn). */
export type GameStateContextValue = AppState & { isReconnecting: boolean };

/** Theme-derived UI tokens (changes only when the active theme changes). */
export type GameUIContextValue = Pick<GameContextType, 'currentTheme'>;

/** Stable action surface — callbacks should read latest state via `stateRef`, not closed `state`. */
export type GameActionsContextValue = Omit<
  GameContextType,
  keyof AppState | 'currentTheme' | 'isReconnecting'
>;
