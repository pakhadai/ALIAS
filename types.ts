
import type { DataConnection } from 'peerjs';

export enum GameState {
  MENU = 'MENU',
  RULES = 'RULES',
  ENTER_NAME = 'ENTER_NAME',
  JOIN_INPUT = 'JOIN_INPUT',
  LOBBY = 'LOBBY',
  SETTINGS = 'SETTINGS',
  TEAMS = 'TEAMS',
  PRE_ROUND = 'PRE_ROUND',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  ROUND_SUMMARY = 'ROUND_SUMMARY',
  SCOREBOARD = 'SCOREBOARD',
  GAME_OVER = 'GAME_OVER'
}

export enum Language { UA = 'UA', DE = 'DE', EN = 'EN' }
export enum Category { GENERAL = 'General', FOOD = 'Food', TRAVEL = 'Travel', SCIENCE = 'Science', MOVIES = 'Movies', CUSTOM = 'Custom' }
export enum AppTheme { PREMIUM_DARK = 'PREMIUM_DARK', PREMIUM_LIGHT = 'PREMIUM_LIGHT', CYBERPUNK = 'CYBERPUNK' }
export enum SoundPreset { FUN = 'FUN', MINIMAL = 'MINIMAL', EIGHT_BIT = 'EIGHT_BIT' }

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

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  stats: { explained: number };
}

export interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
  colorHex: string;
  players: Player[];
  nextPlayerIndex: number;
}

export interface GameSettings {
  language: Language;
  roundTime: number;
  scoreToWin: number;
  skipPenalty: boolean;
  categories: Category[];
  soundEnabled: boolean;
  soundPreset: SoundPreset;
  teamCount: number;
  theme: AppTheme;
  customWords?: string;
}

export interface RoundStats {
  correct: number;
  skipped: number;
  words: { word: string; result: 'correct' | 'skipped' }[];
  teamId: string;
  explainerName: string;
  explainerId?: string;
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
  isHostReconnecting: boolean;
  reconnectTimeLeft: number;
  notification: { message: string, type: 'info' | 'error' | 'success' } | null;
  peerError: string | null;
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
}

export type NetworkActionType = 'JOIN_REQUEST' | 'SYNC_STATE' | 'GAME_ACTION' | 'KICK_PLAYER';

export interface GameActionPayload {
  action: 'CORRECT' | 'SKIP' | 'START_GAME' | 'START_ROUND' | 'START_PLAYING' | 'NEXT_ROUND' | 'RESET_GAME' | 'REMATCH' | 'UPDATE_SETTINGS' | 'GENERATE_TEAMS' | 'PAUSE_GAME' | 'KICK_PLAYER';
  data?: any;
}

export interface NetworkMessage {
  type: NetworkActionType;
  payload: any;
}

export interface PeerConnection extends DataConnection {
  playerId?: string;
}
