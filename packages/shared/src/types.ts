import { Language, Category, SoundPreset, AppTheme, GameMode } from './enums';

export interface Player {
  id: string;
  persistentId?: string;
  name: string;
  avatar: string;
  isHost: boolean;
  avatarId?: string | null;
  /** false = socket offline, grace period or gone; true/undefined = connected (undefined for offline/local). */
  isConnected?: boolean;
  stats: { explained: number; guessed: number };
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

export interface GameTask {
  id: string;
  prompt: string;
  answer?: string;
  options?: string[];
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
  customDeckCode?: string;
  selectedPackIds?: string[];
  gameMode?: GameMode;
  targetLanguage?: Language;
}

export interface RoundStats {
  correct: number;
  skipped: number;
  words: { word: string; taskId?: string; result: 'correct' | 'skipped' | 'guessed' }[];
  teamId: string;
  explainerName: string;
  explainerId?: string;
}

export type GameActionType =
  | 'CORRECT'
  | 'SKIP'
  | 'START_GAME'
  | 'START_DUEL'
  | 'START_ROUND'
  | 'START_PLAYING'
  | 'NEXT_ROUND'
  | 'RESET_GAME'
  | 'REMATCH'
  | 'UPDATE_SETTINGS'
  | 'GENERATE_TEAMS'
  | 'PAUSE_GAME'
  | 'KICK_PLAYER'
  | 'TIME_UP'
  | 'CONFIRM_ROUND'
  | 'ADD_OFFLINE_PLAYER'
  | 'REMOVE_OFFLINE_PLAYER'
  | 'GUESS_OPTION';

export interface GameActionPayload {
  action: GameActionType;
  data?: any;
}

export type NetworkActionType =
  | 'JOIN_REQUEST'
  | 'SYNC_STATE'
  | 'GAME_ACTION'
  | 'KICK_PLAYER'
  | 'KICKED';

export interface NetworkMessage {
  type: NetworkActionType;
  payload: any;
}
