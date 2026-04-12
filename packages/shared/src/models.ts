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

/** Quiz deck JSON kinds (server-generated QUIZ tasks). */
export type QuizTaskKind = 'BASIC' | 'SYNONYM' | 'ANTONYM' | 'TRANSLATION' | 'TABOO';

export interface GameTask {
  id: string;
  prompt: string;
  answer?: string;
  options?: string[];
  /** Optional mode-specific task kind (used by QUIZ UI for labels). */
  kind?: QuizTaskKind;
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
  /** TEAMS = players play in teams, SOLO = each player is their own "team". */
  teamMode?: 'TEAMS' | 'SOLO';
  teamCount: number;
  theme: AppTheme;
  customWords?: string;
  customDeckCode?: string;
  /** Display name for UI (from API / deep link); optional on server. */
  customDeckName?: string;
  selectedPackIds?: string[];
  targetLanguage?: Language;
}

export type QuizTimerMode = 'ROUND' | 'PER_TASK';

export interface QuizTypesSettings {
  synonyms: boolean;
  antonyms: boolean;
  taboo: boolean;
  translation: boolean;
}

export type ModeSettings =
  | {
      gameMode: GameMode.CLASSIC | GameMode.TRANSLATION | GameMode.SYNONYMS;
      /** Round time for classic-like modes (seconds). */
      classicRoundTime: number;
    }
  | {
      gameMode: GameMode.QUIZ;
      /**
       * Legacy/shared slider value.
       * For QUIZ we prefer quizRoundTime / quizQuestionTime, but keep this for backward compatibility.
       */
      classicRoundTime: number;
      /** Which timer drives gameplay. */
      quizTimerMode: QuizTimerMode;
      /** Round duration in seconds (used when quizTimerMode = 'ROUND', and always as the overall cap). */
      quizRoundTime: number;
      /** Per-question duration in seconds (used when quizTimerMode = 'PER_TASK'). */
      quizQuestionTime: number;
      /** Which types of quiz tasks to include from the deck. */
      quizTypes: QuizTypesSettings;
      /** If enabled: wrong answer gives -1 point (once per task per player). */
      quizWrongPenaltyEnabled: boolean;
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
