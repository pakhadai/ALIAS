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
  /** General settings: language/deck/audio/theme/etc. */
  general: GeneralSettings;
  /** Mode-specific settings: depends on selected gameMode. */
  mode: ModeSettings;
}

export interface GeneralSettings {
  language: Language;
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
  targetLanguage?: Language;
}

export type ModeSettings =
  | {
      gameMode: GameMode.CLASSIC | GameMode.TRANSLATION | GameMode.SYNONYMS | GameMode.QUIZ;
      /** Round time for classic-like modes (seconds). */
      classicRoundTime: number;
    }
  | {
      gameMode: GameMode.HARDCORE;
      /** Round time for hardcore mode (seconds). */
      classicRoundTime: number;
    }
  | {
      gameMode: GameMode.IMPOSTER;
      /** Discussion timer (seconds). */
      imposterDiscussionTime: number;
    };

/** Per-round scoring and word history for the active team. */
export interface RoundStats {
  correct: number;
  skipped: number;
  words: { word: string; taskId?: string; result: 'correct' | 'skipped' | 'guessed' }[];
  teamId: string;
  explainerName: string;
  explainerId?: string;
}
