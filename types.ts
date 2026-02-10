
// Fix: Import DataConnection correctly from peerjs
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

export enum Language {
  UA = 'UA',
  DE = 'DE',
  EN = 'EN'
}

export enum Category {
  GENERAL = 'General',
  FOOD = 'Food',
  TRAVEL = 'Travel',
  SCIENCE = 'Science',
  MOVIES = 'Movies',
  CUSTOM = 'Custom'
}

export enum AppTheme {
  PREMIUM_DARK = 'PREMIUM_DARK',
  PREMIUM_LIGHT = 'PREMIUM_LIGHT',
  CYBERPUNK = 'CYBERPUNK',
  NATURE = 'NATURE',
  OCEAN = 'OCEAN',
  CANDY = 'CANDY',
  MATRIX = 'MATRIX'
}

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

export enum SoundPreset {
  FUN = 'FUN',
  MINIMAL = 'MINIMAL',
  EIGHT_BIT = 'EIGHT_BIT'
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  stats?: {
    explained: number;
  };
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
}

export interface RoundStats {
  correct: number;
  skipped: number;
  words: { word: string; result: 'correct' | 'skipped' }[];
  teamId: string;
  explainerName: string;
  explainerId?: string;
}

export type NetworkActionType = 
  | 'JOIN_REQUEST' 
  | 'SYNC_STATE'
  | 'GAME_ACTION'
  | 'KICK_PLAYER';

export interface NetworkMessage {
  type: NetworkActionType;
  payload: any;
}

export interface GameActionPayload {
  action: 'CORRECT' | 'SKIP' | 'START_GAME' | 'START_ROUND' | 'START_PLAYING' | 'NEXT_ROUND' | 'RESET_GAME' | 'REMATCH' | 'UPDATE_SETTINGS' | 'GENERATE_TEAMS' | 'PAUSE_GAME' | 'KICK_PLAYER';
  data?: any;
}

// Fix: Explicitly define key members of DataConnection to prevent property-not-found errors
export interface PeerConnection extends DataConnection {
  playerId?: string;
  open: boolean;
  send: (data: any) => void;
  close: () => void;
  on: (event: string, cb: (...args: any[]) => void) => any;
}
