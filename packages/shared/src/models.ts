import type { Language, Category, SoundPreset, AppTheme, GameMode } from './enums';

/** Player in a room (online or offline). */
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
  /** Display name for UI (from API / deep link); optional on server. */
  customDeckName?: string;
  selectedPackIds?: string[];
  gameMode?: GameMode;
  targetLanguage?: Language;
}

/** Per-round scoring and word history for the active team. */
export interface RoundStats {
  correct: number;
  skipped: number;
  words: { word: string; taskId?: string; result: 'correct' | 'skipped' | 'guessed' }[];
  teamId: string;
  explainerName: string;
  explainerId?: string;
}
