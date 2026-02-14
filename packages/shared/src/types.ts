import { Language, Category, SoundPreset, AppTheme } from './enums';

export interface Player {
  id: string;
  persistentId?: string;
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
  | 'REMOVE_OFFLINE_PLAYER';

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
