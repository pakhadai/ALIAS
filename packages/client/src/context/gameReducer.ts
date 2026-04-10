import { GameState, Language, Category, AppTheme, SoundPreset, GameMode } from '../types';
import type { AppState, Player, GameSettings } from '../types';

export const SESSION_KEY = 'alias_active_session';
export const PREFS_KEY = 'alias_preferences';

// States that are safe to restore (no active timers/countdowns)
export const SAVABLE_STATES = new Set([
  GameState.LOBBY,
  GameState.SETTINGS,
  GameState.TEAMS,
  GameState.VS_SCREEN,
  GameState.PRE_ROUND,
  GameState.COUNTDOWN,
  GameState.PLAYING,
  GameState.ROUND_SUMMARY,
  GameState.SCOREBOARD,
  GameState.GAME_OVER,
]);

export type Action =
  | { type: 'SET_STATE'; payload: Partial<AppState> }
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }
  | { type: 'SHOW_NOTIF'; payload: { message: string; type: 'info' | 'error' | 'success' } | null };

export const initialState: AppState = {
  gameState: GameState.MENU,
  gameMode: 'ONLINE',
  uiLanguage: Language.UA,
  settings: {
    general: {
      language: Language.UA,
      scoreToWin: 30,
      skipPenalty: true,
      categories: [Category.GENERAL],
      soundEnabled: true,
      soundPreset: SoundPreset.FUN,
      teamMode: 'TEAMS',
      teamCount: 2,
      theme: AppTheme.PREMIUM_DARK,
    },
    mode: { gameMode: GameMode.CLASSIC, classicRoundTime: 60 },
  },
  roomCode: '',
  isHost: false,
  myPlayerId: '',
  players: [],
  teams: [],
  teamsLocked: false,
  currentTeamIndex: 0,
  wordDeck: [],
  currentWord: '',
  currentTask: null,
  currentTaskAnswered: undefined,
  currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: '', explainerName: '' },
  timeLeft: 0,
  isPaused: false,
  isConnected: false,
  notification: null,
  connectionError: null,
  connectionErrorCode: null,

  imposterPhase: undefined,
  imposterPlayerId: undefined,
  revealedPlayerIds: [],
  imposterSecret: null,
  imposterOfflineRevealIndex: 0,
  imposterWord: null,
};

export function gameReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'UPDATE_PLAYERS':
      return { ...state, players: action.payload };
    case 'SHOW_NOTIF':
      return { ...state, notification: action.payload };
    default:
      return state;
  }
}

export function restoreSession(init: AppState): AppState {
  // Always restore user preferences (theme, sound, uiLanguage) regardless of active session
  try {
    const rawPrefs = localStorage.getItem(PREFS_KEY);
    if (rawPrefs) {
      const prefs = JSON.parse(rawPrefs);
      // Backward-compatible prefs: either flat {theme, language, ...} or nested {general:{...}}
      const generalFromPrefs =
        prefs && typeof prefs === 'object' && 'general' in prefs
          ? (prefs.general as Partial<GameSettings['general']>)
          : (prefs as Partial<GameSettings['general']>);
      // uiLanguage is stored at the top level of prefs (not inside 'general').
      // settings.general.language = word deck language (room-synced, not device-stored).
      const { language: _omitLang, ...prefsGeneral } = generalFromPrefs ?? {};
      const uiLang =
        (prefs?.uiLanguage as Language | undefined) ??
        // Legacy: if old prefs had language at top level, migrate it
        (generalFromPrefs?.language as Language | undefined) ??
        Language.UA;
      init = {
        ...init,
        uiLanguage: uiLang,
        settings: { ...init.settings, general: { ...init.settings.general, ...prefsGeneral } },
      };
    }
  } catch (_err) {
    void _err;
  }

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return init;
    const saved = JSON.parse(raw);
    if (!saved || !saved.isHost || !saved.roomCode) return init;

    // Map timer-dependent states to safe restore points
    let gameState = saved.gameState;
    if (gameState === GameState.PLAYING || gameState === GameState.COUNTDOWN) {
      gameState = GameState.PRE_ROUND;
    }
    if (!SAVABLE_STATES.has(gameState)) return init;

    return {
      ...init,
      gameState,
      gameMode: saved.gameMode || 'ONLINE',
      settings: {
        ...init.settings,
        ...(saved.settings?.general
          ? (() => {
              const {
                theme: _theme,
                soundEnabled: _soundEnabled,
                soundPreset: _soundPreset,
                ...syncedGeneral
              } = (saved.settings.general as Partial<GameSettings['general']>) ?? {};
              return { general: { ...init.settings.general, ...syncedGeneral } };
            })()
          : {}),
        ...(saved.settings?.mode
          ? { mode: { ...init.settings.mode, ...saved.settings.mode } }
          : {}),
      },
      roomCode: saved.roomCode,
      isHost: true,
      myPlayerId: saved.myPlayerId || '',
      players: Array.isArray(saved.players) ? saved.players : [],
      teams: Array.isArray(saved.teams) ? saved.teams : [],
      currentTeamIndex: typeof saved.currentTeamIndex === 'number' ? saved.currentTeamIndex : 0,
      wordDeck: Array.isArray(saved.wordDeck) ? saved.wordDeck : [],
      currentWord: gameState === GameState.ROUND_SUMMARY ? saved.currentWord || '' : '',
      currentTask: gameState === GameState.ROUND_SUMMARY ? saved.currentTask || null : null,
      currentRoundStats:
        gameState === GameState.ROUND_SUMMARY
          ? saved.currentRoundStats || init.currentRoundStats
          : init.currentRoundStats,
      timeLeft: 0,
      isPaused: false,
      isConnected: false,
    };
  } catch (_err) {
    void _err;
    return init;
  }
}
