import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  GameState,
  Language,
  Team,
  GameSettings,
  Category,
  Player,
  GameActionPayload,
  AppState,
  GameContextType,
  GameMode,
  GameStateContextValue,
  GameUIContextValue,
  GameActionsContextValue,
} from '../types';
import { MOCK_WORDS, THEME_CONFIG, DEFAULT_APP_THEME } from '../constants';
import { useAudio } from '../hooks/useAudio';
import { useSocketConnection } from '../hooks/useSocketConnection';
import { ToastNotification } from '../components/Shared';
import {
  fetchLobbySettings,
  fetchDeckByCode,
  isAnonymousSession,
  PLAYER_ID_KEY,
  ROOM_CODE_KEY,
} from '../services/api';
import { mergeSavedLobbyDefaultsIntoSettings } from '../lib/lobbyDefaults';
import type { GameSyncState, RoomErrorPayload } from '@movli/shared';
import { shuffleArray, TIME_UP_IDLE_FALLBACK_MS } from '@movli/shared';
import { truncateUtf16Safe } from '../utils/utf16';
import { bestTextOnColor } from '../utils/color';
import { buildOfflineTask } from '../utils/gameTask';
import { getUiStrings } from '../hooks/useT';
import { AVATARS } from '../utils/avatars';
export { AVATARS };
import {
  SESSION_KEY,
  PREFS_KEY,
  SAVABLE_STATES,
  initialState,
  gameReducer,
  restoreSession,
  isEmptySavedLobbySettings,
} from './gameReducer';
import { applyOfflineGameAction } from './offlineGameActions';
import {
  canEmitOnlineGameAction,
  isSessionEndedRoomError,
  resolveRoomErrorMessage,
  shouldEjectToMenuOnSessionEnd,
} from '../utils/roomErrorMessage';
import {
  attemptRoomJoin,
  getStoredRejoinSession,
  isValidRoomCode,
  roomJoinEnterNamePayload,
} from '../utils/roomJoin';
import { useAuthContext } from './AuthContext';
import { useTelegramLobbyDeepLink } from '../hooks/useTelegramLobbyDeepLink';

const GameStateContext = createContext<GameStateContextValue | undefined>(undefined);
const GameUIContext = createContext<GameUIContextValue | undefined>(undefined);
const GameActionsContext = createContext<GameActionsContextValue | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState, restoreSession);
  const stateRef = useRef(state);
  stateRef.current = state;
  const { isAuthenticated } = useAuthContext();

  const { play: playSound } = useAudio(state.settings);

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineTimeUpFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set by `startOfflineGame` until first offline join completes — avoids stale `gameMode` races. */
  const offlineJoinPendingRef = useRef(false);
  /** Last server-confirmed settings — used to rollback optimistic host updates on room:error. */
  const lastSyncedSettingsRef = useRef<GameSettings | null>(null);
  const pendingOptimisticSettingsRef = useRef(false);
  const socketLeaveRef = useRef<(() => void) | null>(null);

  const showNotification = useCallback(
    (message: string, type: 'info' | 'error' | 'success' = 'info') => {
      if (notifTimerRef.current !== null) {
        clearTimeout(notifTimerRef.current);
      }
      dispatch({ type: 'SHOW_NOTIF', payload: { message, type } });
      notifTimerRef.current = setTimeout(() => {
        notifTimerRef.current = null;
        dispatch({ type: 'SHOW_NOTIF', payload: null });
      }, 3000);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (notifTimerRef.current !== null) clearTimeout(notifTimerRef.current);
    };
  }, []); // Legitimate: unmount cleanup for notification timer ref.

  // PWA/deep-link bootstrap — deferred: reads window.location once at app load (see AUDIT D-4).
  useEffect(() => {
    if (stateRef.current.gameState !== GameState.MENU) return;
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get('purchase');
    const deckParam = params.get('deck');

    const stripSearchParams = (keys: string[]) => {
      const u = new URL(window.location.href);
      keys.forEach((k) => u.searchParams.delete(k));
      const qs = u.searchParams.toString();
      window.history.replaceState({}, '', qs ? `${u.pathname}?${qs}` : u.pathname);
    };

    if (purchase === 'success' || purchase === 'cancelled') {
      dispatch({ type: 'SET_STATE', payload: { gameState: GameState.STORE } });
      return;
    }

    void (async () => {
      const stripKeys: string[] = [];
      if (deckParam != null && deckParam.trim() !== '') {
        const code = deckParam
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 20);
        if (code.length >= 4) {
          try {
            const deck = await fetchDeckByCode(code);
            dispatch({
              type: 'SET_STATE',
              payload: {
                settings: {
                  ...stateRef.current.settings,
                  general: {
                    ...stateRef.current.settings.general,
                    customDeckCode: deck.accessCode ?? code,
                    customDeckName: deck.name,
                  },
                },
              },
            });
            const uiStrings = getUiStrings(stateRef.current.uiLanguage);
            showNotification(
              uiStrings.customDeckDeepLinkSuccess.replace('{name}', deck.name),
              'success'
            );
          } catch {
            showNotification(
              getUiStrings(stateRef.current.uiLanguage).customDeckDeepLinkError,
              'error'
            );
          }
        }
        stripKeys.push('deck');
      }

      if (stripKeys.length > 0) stripSearchParams(stripKeys);
    })();
  }, [showNotification]);

  // Save host session to localStorage — omit timeLeft from deps so timer sync does not write every tick.
  useEffect(() => {
    if (!state.isHost || state.gameMode === 'OFFLINE') return;
    if (!SAVABLE_STATES.has(state.gameState)) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          gameState: state.gameState,
          gameMode: state.gameMode,
          settings: state.settings,
          roomCode: state.roomCode,
          isHost: true,
          myPlayerId: state.myPlayerId,
          players: state.players,
          teams: state.teams,
          currentTeamIndex: state.currentTeamIndex,
          wordDeck: state.wordDeck,
          currentWord: state.currentWord,
          currentTask: state.currentTask,
          currentRoundStats: state.currentRoundStats,
          // Use ref to avoid persisting every second tick.
          timeLeft: stateRef.current.timeLeft,
          isPaused: state.isPaused,
        })
      );
    } catch (_err) {
      void _err;
    }
  }, [
    state.isHost,
    state.gameMode,
    state.gameState,
    state.roomCode,
    state.settings,
    state.myPlayerId,
    state.players,
    state.teams,
    state.currentTeamIndex,
    state.wordDeck,
    state.currentWord,
    state.currentTask,
    state.currentRoundStats,
    state.isPaused,
  ]);

  // Warn host before closing/refreshing during active game
  useEffect(() => {
    const activeStates = new Set([
      GameState.PRE_ROUND,
      GameState.COUNTDOWN,
      GameState.PLAYING,
      GameState.ROUND_SUMMARY,
      GameState.SCOREBOARD,
    ]);
    if (!state.isHost || !activeStates.has(state.gameState)) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.isHost, state.gameState]);

  // Fisher-Yates shuffle — shared util (noUncheckedIndexedAccess-safe)
  const offlineTaskIdRef = useRef(0);
  const offlineQuizLockTaskIdRef = useRef<string | null>(null);

  const nextWordLogic = useCallback(() => {
    offlineQuizLockTaskIdRef.current = null;
    const { settings, wordDeck } = stateRef.current;
    const { general, mode } = settings;
    let deck = [...wordDeck];
    if (deck.length === 0) {
      const pool = general.categories.flatMap((cat) => {
        if (cat === Category.CUSTOM && general.customWords) {
          return general.customWords
            .split(',')
            .map((w) => w.trim().replace(/<[^>]*>/g, ''))
            .filter(Boolean);
        }
        return MOCK_WORDS[general.language][cat] || [];
      });

      const finalPool =
        pool.length > 0 ? pool : MOCK_WORDS[general.language][Category.GENERAL] || [];
      deck = shuffleArray(finalPool);
    }
    const word = deck.pop() || 'Error';
    offlineTaskIdRef.current += 1;
    const taskId = `offline-${offlineTaskIdRef.current}-${Date.now()}`;
    const task = buildOfflineTask(word, deck, mode.gameMode, taskId);
    dispatch({
      type: 'SET_STATE',
      payload: { wordDeck: deck, currentWord: task.prompt, currentTask: task },
    });
  }, []);

  const nextOfflineImposterWord = useCallback((): string => {
    const { settings, wordDeck } = stateRef.current;
    const { general } = settings;
    let deck = [...wordDeck];
    if (deck.length === 0) {
      const pool = general.categories.flatMap((cat) => {
        if (cat === Category.CUSTOM && general.customWords) {
          return general.customWords
            .split(',')
            .map((w) => w.trim().replace(/<[^>]*>/g, ''))
            .filter(Boolean);
        }
        return MOCK_WORDS[general.language][cat] || [];
      });
      const finalPool =
        pool.length > 0 ? pool : MOCK_WORDS[general.language][Category.GENERAL] || [];
      deck = shuffleArray(finalPool);
    }
    const word = deck.pop() || 'Error';
    dispatch({ type: 'SET_STATE', payload: { wordDeck: deck } });
    return word;
  }, []);

  const handleGameAction = useCallback(
    (payload: GameActionPayload) => {
      applyOfflineGameAction(
        {
          stateRef,
          dispatch,
          playSound,
          nextWordLogic,
          nextOfflineImposterWord,
          offlineQuizLockTaskIdRef,
        },
        payload
      );
    },
    [playSound, nextWordLogic, nextOfflineImposterWord]
  );

  // Socket.io connection for server-based online mode
  const socketApi = useSocketConnection({
    onStateSync: useCallback((syncState: GameSyncState) => {
      if (stateRef.current.gameMode === 'OFFLINE') return;

      // Client-only navigation states that overlay the lobby — don't let
      // a server LOBBY broadcast kick the user out of a settings screen.
      // ENTER_NAME is also protected: auto-rejoin can fire mid-creation and
      // must not navigate the user away before room:create is processed.
      const CLIENT_NAV_STATES = new Set([
        GameState.ENTER_NAME,
        GameState.SETTINGS,
        GameState.MY_WORD_PACKS,
        GameState.MY_DECKS,
        GameState.RULES,
        GameState.PLAYER_STATS,
        GameState.STORE,
        GameState.PROFILE,
        GameState.PROFILE_SETTINGS,
        GameState.LOBBY_SETTINGS,
      ]);
      const currentClientState = stateRef.current.gameState;
      const keepClientNav =
        CLIENT_NAV_STATES.has(currentClientState) && syncState.gameState === GameState.LOBBY;

      lastSyncedSettingsRef.current = syncState.settings;
      pendingOptimisticSettingsRef.current = false;

      // Game settings sync from server, but keep device-only preferences local.
      // Personal prefs: theme/sound should NOT be controlled by lobby settings.
      const settings = {
        ...syncState.settings,
        general: {
          ...syncState.settings.general,
          theme: stateRef.current.settings.general.theme,
          soundEnabled: stateRef.current.settings.general.soundEnabled,
          soundPreset: stateRef.current.settings.general.soundPreset,
        },
      };

      // Критично: isHost має оновлюватися з сервера при кожному sync (наприклад після міграції хоста)
      const myId = stateRef.current.myPlayerId;
      const me = syncState.players.find((p) => p.id === myId);
      const isHostFromSync = me?.isHost ?? stateRef.current.isHost;

      const payload: Partial<AppState> = {
        settings,
        roomCode: syncState.roomCode,
        players: syncState.players,
        teams: syncState.teams,
        teamsLocked: syncState.teamsLocked ?? false,
        currentTeamIndex: syncState.currentTeamIndex,
        currentWord: syncState.currentWord,
        currentTask: syncState.currentTask ?? null,
        currentTaskAnswered: syncState.currentTaskAnswered,
        currentRoundStats: syncState.currentRoundStats,
        timeLeft: syncState.timeLeft,
        roundEndsAt: syncState.roundEndsAt,
        quizRoundTimeLeft: syncState.quizRoundTimeLeft,
        quizTaskLockUntil: syncState.quizTaskLockUntil,
        roundsPlayed: syncState.roundsPlayed ?? 0,
        usedWords: syncState.usedWords ?? [],
        isPaused: syncState.isPaused,
        timeUp: syncState.timeUp,
        wordDeck: syncState.wordDeck,
        imposterPhase: syncState.imposterPhase,
        imposterPlayerId: syncState.imposterPlayerId,
        revealedPlayerIds: syncState.revealedPlayerIds ?? [],
        isHost: isHostFromSync,
        isConnected: true,
        connectionError: null,
        connectionErrorCode: null,
      };

      // Змінюємо екран ТІЛЬКИ якщо нам не треба зберігати поточну навігацію клієнта
      if (!keepClientNav) {
        payload.gameState = syncState.gameState;
      }

      dispatch({
        type: 'SET_STATE',
        payload,
      });
    }, []),
    onImposterSecret: useCallback((payload: { isImposter: boolean; word: string | null }) => {
      dispatch({ type: 'SET_STATE', payload: { imposterSecret: payload } });
    }, []),
    onPlayerJoined: useCallback(
      (player: Player) => {
        showNotification(`${player.name} приєднався`, 'info');
      },
      [showNotification]
    ),
    onPlayerLeft: useCallback(
      (_playerId: string) => {
        void _playerId;
        showNotification('Гравець вийшов', 'info');
      },
      [showNotification]
    ),
    onKicked: useCallback(() => {
      dispatch({
        type: 'SET_STATE',
        payload: {
          gameState: GameState.MENU,
          isConnected: false,
          connectionError: null,
          connectionErrorCode: null,
        },
      });
      showNotification('Вас видалили з гри', 'error');
    }, [showNotification]),
    onError: useCallback(
      (err: RoomErrorPayload) => {
        if (
          pendingOptimisticSettingsRef.current &&
          lastSyncedSettingsRef.current &&
          stateRef.current.gameMode === 'ONLINE' &&
          stateRef.current.isHost
        ) {
          const synced = lastSyncedSettingsRef.current;
          dispatch({
            type: 'SET_STATE',
            payload: {
              settings: {
                ...synced,
                general: {
                  ...synced.general,
                  theme: stateRef.current.settings.general.theme,
                  soundEnabled: stateRef.current.settings.general.soundEnabled,
                  soundPreset: stateRef.current.settings.general.soundPreset,
                },
              },
            },
          });
          pendingOptimisticSettingsRef.current = false;
        }
        const cur = stateRef.current;
        const uiLang = cur.uiLanguage;
        const message = resolveRoomErrorMessage(err.code, err.message, uiLang);

        if (
          isSessionEndedRoomError(err.code) &&
          shouldEjectToMenuOnSessionEnd(cur.gameMode, cur.roomCode)
        ) {
          try {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(ROOM_CODE_KEY);
            localStorage.removeItem(PLAYER_ID_KEY);
          } catch (_err) {
            void _err;
          }
          socketLeaveRef.current?.();
          offlineJoinPendingRef.current = false;
          dispatch({
            type: 'SET_STATE',
            payload: {
              gameState: GameState.MENU,
              gameMode: 'ONLINE',
              isHost: false,
              isConnected: false,
              roomCode: '',
              myPlayerId: '',
              players: [],
              teams: [],
              teamsLocked: false,
              connectionError: null,
              connectionErrorCode: null,
            },
          });
          showNotification(getUiStrings(uiLang).sessionEnded, 'error');
          return;
        }

        dispatch({
          type: 'SET_STATE',
          payload: { connectionError: message, connectionErrorCode: err.code },
        });
        showNotification(message, 'error');
      },
      [showNotification]
    ),
    onNotification: useCallback(
      (message: string, type: 'info' | 'error' | 'success') => {
        showNotification(message, type);
      },
      [showNotification]
    ),
    onRejoined: useCallback((_roomCode: string, playerId: string) => {
      // Після rejoin сервер надішле game:state-sync — isHost оновиться звідти
      dispatch({
        type: 'SET_STATE',
        payload: {
          gameMode: 'ONLINE',
          myPlayerId: playerId,
          gameState: GameState.LOBBY,
          isConnected: true,
          connectionError: null,
          connectionErrorCode: null,
        },
      });
    }, []),
  });

  useEffect(() => {
    socketLeaveRef.current = socketApi.leaveRoom;
  }, [socketApi.leaveRoom]);

  // Після повного reload сокет не підключений, але ключі rejoin уже в localStorage —
  // інакше `room:rejoin` у useSocketConnection ніколи не виконається.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedRoom = localStorage.getItem(ROOM_CODE_KEY);
      const storedPlayer = localStorage.getItem(PLAYER_ID_KEY);
      if (!storedRoom || !storedPlayer) return;
      // Validate before connecting to prevent "INVALID_PAYLOAD" rejoin errors.
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!isValidRoomCode(storedRoom) || !UUID_RE.test(storedPlayer)) {
        localStorage.removeItem(ROOM_CODE_KEY);
        localStorage.removeItem(PLAYER_ID_KEY);
        return;
      }
      socketApi.connect();
    } catch {
      /* ignore */
    }
  }, [socketApi]);

  const deepLinkRoomHandledRef = useRef(false);

  // PWA ?room= bootstrap — requires socket API for existence check (see utils/roomJoin).
  useEffect(() => {
    if (deepLinkRoomHandledRef.current) return;
    if (stateRef.current.gameState !== GameState.MENU) return;

    const room = new URLSearchParams(window.location.search).get('room');
    if (!room || !isValidRoomCode(room)) return;

    deepLinkRoomHandledRef.current = true;

    const stripRoomParam = () => {
      const u = new URL(window.location.href);
      u.searchParams.delete('room');
      const qs = u.searchParams.toString();
      window.history.replaceState({}, '', qs ? `${u.pathname}?${qs}` : u.pathname);
    };

    // Reload with persisted session: auto-rejoin handles restore — skip join flow.
    if (getStoredRejoinSession(room)) {
      stripRoomParam();
      return;
    }

    void (async () => {
      const result = await attemptRoomJoin(room, {
        checkRoomExists: socketApi.checkRoomExists,
        onJoin: (code) => {
          dispatch({
            type: 'SET_STATE',
            payload: roomJoinEnterNamePayload(code),
          });
        },
      });

      stripRoomParam();

      const uiStrings = getUiStrings(stateRef.current.uiLanguage);
      if (result === 'not_found') {
        showNotification(uiStrings.roomNotFound.replace('{0}', room), 'error');
      } else if (result === 'error') {
        showNotification(uiStrings.tgDeepLinkJoinFailed, 'error');
      }
    })();
  }, [showNotification, socketApi.checkRoomExists]);

  const sendGameAction = socketApi.sendGameAction;
  const notifyRoomNotReady = useCallback(() => {
    const t = getUiStrings(stateRef.current.uiLanguage);
    showNotification(t.roomActionNotReady, 'error');
  }, [showNotification]);

  const isOnlineRoomReady = useCallback((): boolean => {
    return canEmitOnlineGameAction(stateRef.current.roomCode, {
      isConnected: socketApi.isConnected,
      isReconnecting: socketApi.isReconnecting,
      roomCode: socketApi.roomCode,
    });
  }, [socketApi.isConnected, socketApi.isReconnecting, socketApi.roomCode]);

  const sendAction = useCallback(
    (action: GameActionPayload) => {
      if (stateRef.current.gameMode === 'ONLINE') {
        if (!isOnlineRoomReady()) {
          notifyRoomNotReady();
          return;
        }
        sendGameAction(action);
      } else {
        handleGameAction(action);
      }
    },
    [handleGameAction, isOnlineRoomReady, notifyRoomNotReady, sendGameAction]
  );

  const clearOfflineTimeUpFallback = useCallback(() => {
    if (offlineTimeUpFallbackRef.current !== null) {
      clearTimeout(offlineTimeUpFallbackRef.current);
      offlineTimeUpFallbackRef.current = null;
    }
  }, []);

  /** Mirror server `scheduleTimeUpFallback`: auto-finish idle overtime after TIME_UP_IDLE_FALLBACK_MS. */
  useEffect(() => {
    if (state.gameMode !== 'OFFLINE') {
      clearOfflineTimeUpFallback();
      return;
    }
    if (state.gameState !== GameState.PLAYING || !state.timeUp) {
      clearOfflineTimeUpFallback();
      return;
    }
    if (state.settings.mode.gameMode === GameMode.QUIZ) {
      clearOfflineTimeUpFallback();
      return;
    }

    clearOfflineTimeUpFallback();
    offlineTimeUpFallbackRef.current = setTimeout(() => {
      offlineTimeUpFallbackRef.current = null;
      const cur = stateRef.current;
      if (
        cur.gameMode === 'OFFLINE' &&
        cur.gameState === GameState.PLAYING &&
        cur.timeUp &&
        cur.settings.mode.gameMode !== GameMode.QUIZ
      ) {
        handleGameAction({ action: 'TIME_UP' });
      }
    }, TIME_UP_IDLE_FALLBACK_MS);

    return () => {
      clearOfflineTimeUpFallback();
    };
  }, [
    state.gameMode,
    state.gameState,
    state.timeUp,
    state.settings.mode.gameMode,
    clearOfflineTimeUpFallback,
    handleGameAction,
  ]);

  // Sync socket connection state back to app state
  useEffect(() => {
    if (state.gameMode !== 'ONLINE') return;
    if (socketApi.myPlayerId && socketApi.myPlayerId !== state.myPlayerId) {
      dispatch({ type: 'SET_STATE', payload: { myPlayerId: socketApi.myPlayerId } });
    }
    if (socketApi.roomCode && socketApi.roomCode !== state.roomCode) {
      dispatch({ type: 'SET_STATE', payload: { roomCode: socketApi.roomCode } });
    }
  }, [socketApi.myPlayerId, socketApi.roomCode, state.gameMode, state.myPlayerId, state.roomCode]);

  const currentTheme = useMemo(() => {
    const fallback = THEME_CONFIG[DEFAULT_APP_THEME];
    const themeId = state.settings.general.theme;
    const allowed = Object.prototype.hasOwnProperty.call(THEME_CONFIG, themeId);
    return allowed ? THEME_CONFIG[themeId] : fallback;
  }, [state.settings.general.theme]);

  // Hard-reset unknown themes to default (Warm Paper / PAPER_LUXE)
  useEffect(() => {
    const themeId = state.settings.general.theme;
    const allowed = Object.prototype.hasOwnProperty.call(THEME_CONFIG, themeId);
    if (allowed) return;
    dispatch({
      type: 'SET_STATE',
      payload: {
        settings: {
          ...stateRef.current.settings,
          general: { ...stateRef.current.settings.general, theme: DEFAULT_APP_THEME },
        },
      },
    });
  }, [state.settings.general.theme]);

  // Apply per-theme design tokens via CSS custom properties.
  // useLayoutEffect runs synchronously BEFORE the browser paints, ensuring CSS
  // variables are in sync with the Tailwind class changes from the same render.
  // Using useEffect (post-paint) caused a one-frame mismatch where Tailwind classes
  // showed the new theme but CSS vars still reflected the old one — visible as a
  // flash of the wrong header/background color.
  useLayoutEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--font-heading', currentTheme.fonts.heading);
    r.style.setProperty('--font-body', currentTheme.fonts.body);
    r.style.setProperty('--theme-radius', currentTheme.borderRadius);
    r.style.setProperty('--font-heading-weight', currentTheme.heading?.fontWeight ?? 'inherit');
    r.style.setProperty('--font-heading-transform', currentTheme.heading?.textTransform ?? 'none');
    r.style.setProperty('--font-heading-tracking', currentTheme.heading?.letterSpacing ?? 'normal');
    r.style.colorScheme = currentTheme.isDark ? 'dark' : 'light';

    const tokens = currentTheme.tokens;
    if (tokens) {
      r.style.setProperty('--ui-bg', tokens.bg);
      r.style.setProperty('--ui-surface', tokens.surface);
      r.style.setProperty('--ui-border', tokens.border);
      r.style.setProperty('--ui-accent', tokens.accent);
      r.style.setProperty('--ui-fg', tokens.fg);

      const fgMutedBase = currentTheme.isDark
        ? `color-mix(in_srgb, ${tokens.fg} 72%, ${tokens.bg} 28%)`
        : `color-mix(in_srgb, ${tokens.fg} 55%, ${tokens.surface} 45%)`;
      r.style.setProperty(
        '--ui-fg-muted',
        currentTheme.isDark ? fgMutedBase : `color-mix(in_srgb, ${fgMutedBase} 70%, transparent)`
      );

      r.style.setProperty(
        '--ui-surface-hover',
        `color-mix(in_srgb, ${tokens.surface} 88%, ${tokens.accent} 12%)`
      );

      const elevatedBase =
        tokens.elevated ?? `color-mix(in_srgb, ${tokens.surface} 72%, ${tokens.bg} 28%)`;
      r.style.setProperty('--ui-elevated', elevatedBase);
      r.style.setProperty(
        '--ui-card',
        tokens.elevated
          ? `color-mix(in_srgb, ${tokens.elevated} 88%, ${tokens.bg} 12%)`
          : `color-mix(in_srgb, ${tokens.surface} 70%, ${tokens.bg} 30%)`
      );
      if (currentTheme.isDark) {
        r.style.setProperty(
          '--ui-word-card-bg',
          `color-mix(in_srgb, ${tokens.fg} 90%, #ffffff 10%)`
        );
        r.style.setProperty(
          '--ui-word-card-fg',
          `color-mix(in_srgb, ${tokens.bg} 76%, #0a0a0a 24%)`
        );
        r.style.setProperty(
          '--ui-word-card-border',
          `color-mix(in_srgb, ${tokens.fg} 14%, ${tokens.border} 86%)`
        );
      } else {
        r.style.setProperty('--ui-word-card-bg', tokens.elevated ?? tokens.surface);
        r.style.setProperty('--ui-word-card-fg', tokens.fg);
        r.style.setProperty('--ui-word-card-border', tokens.border);
      }
      r.style.setProperty('--ui-divider', tokens.border);
      r.style.setProperty(
        '--ui-border-subtle',
        `color-mix(in_srgb, ${tokens.border} 62%, ${tokens.bg} 38%)`
      );

      const accentSoftComputed = `color-mix(in_srgb, ${tokens.accent} 58%, ${tokens.surface} 42%)`;
      r.style.setProperty('--ui-accent-soft', accentSoftComputed);
      r.style.setProperty('--ui-accent-muted', accentSoftComputed);
      r.style.setProperty(
        '--ui-accent-hover',
        `color-mix(in_srgb, ${tokens.accent} 88%, #ffffff 12%)`
      );
      r.style.setProperty(
        '--ui-accent-pressed',
        `color-mix(in_srgb, ${tokens.accent} 82%, #000000 18%)`
      );
      r.style.setProperty(
        '--ui-accent-ring',
        `color-mix(in_srgb, ${tokens.accent} 40%, transparent)`
      );

      r.style.setProperty(
        '--ui-accent-alt',
        tokens.accentAlt ?? `color-mix(in_srgb, ${tokens.accent} 65%, ${tokens.fg} 35%)`
      );
      const accentWarmBase = tokens.accentWarm ?? tokens.accent;
      r.style.setProperty('--ui-accent-warm', accentWarmBase);
      r.style.setProperty(
        '--ui-accent-warm-soft',
        `color-mix(in_srgb, ${accentWarmBase} 72%, ${tokens.fg} 28%)`
      );
      r.style.setProperty(
        '--ui-fg-subtle',
        currentTheme.isDark
          ? `color-mix(in_srgb, ${tokens.fg} 48%, ${tokens.bg} 52%)`
          : `color-mix(in_srgb, ${fgMutedBase} 55%, transparent)`
      );
      r.style.setProperty(
        '--ui-fg-disabled',
        `color-mix(in_srgb, ${fgMutedBase} 45%, transparent)`
      );
      r.style.setProperty('--ui-accent-contrast', bestTextOnColor(tokens.accent));
    }

    const accent = (tokens?.accent ?? currentTheme.preview?.accent ?? '#4A5C6A').trim();
    r.style.setProperty('--ui-success', `color-mix(in_srgb, ${accent} 10%, #22C55E 90%)`);
    r.style.setProperty('--ui-warning', `color-mix(in_srgb, ${accent} 10%, #F59E0B 90%)`);
    r.style.setProperty('--ui-danger', `color-mix(in_srgb, ${accent} 10%, #FF3B3B 90%)`);

    // Browser / PWA chrome (address bar, Android nav) — must track *app* theme, not only OS.
    const themeColor = tokens?.bg ?? currentTheme.preview?.bg ?? '#1A1A1A';
    const setMetaContent = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMetaContent('theme-color', themeColor);
    // iOS standalone: pair with page bg so status area doesn’t stay “stuck” on first paint.
    setMetaContent(
      'apple-mobile-web-app-status-bar-style',
      currentTheme.isDark ? 'black-translucent' : 'default'
    );

    const tgWebApp = window.Telegram?.WebApp;
    if (tgWebApp) {
      try {
        tgWebApp.setHeaderColor?.(themeColor);
      } catch {
        /* API may be absent or reject unsupported values */
      }
      try {
        tgWebApp.setBackgroundColor?.(themeColor);
      } catch {
        /* API may be absent or reject unsupported values */
      }
    }
  }, [currentTheme]);

  // <html lang> is now synced in the uiLanguage persistence effect above

  // Sync <html lang> with the user's personal UI language (not the room word-deck language)
  useEffect(() => {
    const lang =
      state.uiLanguage === Language.UA ? 'uk' : state.uiLanguage === Language.DE ? 'de' : 'en';
    document.documentElement.lang = lang;
  }, [state.uiLanguage]);

  // Persist user preferences (theme, sound, uiLanguage) across sessions.
  // uiLanguage is the personal display language — separate from settings.general.language
  // (word deck language, which is a room setting synced between players).
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          theme: state.settings.general.theme,
          soundEnabled: state.settings.general.soundEnabled,
          soundPreset: state.settings.general.soundPreset,
          uiLanguage: state.uiLanguage,
        })
      );
    } catch (_err) {
      void _err;
    }
  }, [
    state.settings.general.theme,
    state.settings.general.soundEnabled,
    state.settings.general.soundPreset,
    state.uiLanguage,
  ]);

  const gameStateValue = useMemo(
    (): GameStateContextValue => ({
      ...state,
      isReconnecting: socketApi.isReconnecting,
    }),
    [state, socketApi.isReconnecting]
  );

  const gameUIValue = useMemo(
    (): GameUIContextValue => ({
      currentTheme,
    }),
    [currentTheme]
  );

  const gameActionsValue = useMemo(
    (): GameActionsContextValue => ({
      setGameState: (s: GameState) => {
        dispatch({ type: 'SET_STATE', payload: { gameState: s } });
      },
      createNewRoom: async () => {
        let mergedSettings = stateRef.current.settings;

        if (!isAnonymousSession()) {
          try {
            const saved = await fetchLobbySettings();
            if (saved && typeof saved === 'object' && !isEmptySavedLobbySettings(saved)) {
              mergedSettings = mergeSavedLobbyDefaultsIntoSettings(
                mergedSettings,
                saved as Partial<GameSettings>
              );
            }
          } catch {
            // offline / network errors: still allow creating a room with local defaults
          }
        }

        dispatch({
          type: 'SET_STATE',
          payload: {
            isHost: true,
            gameState: GameState.ENTER_NAME,
            gameMode: 'ONLINE',
            connectionError: null,
            connectionErrorCode: null,
            settings: mergedSettings,
          },
        });
      },
      handleJoin: async (
        id: string,
        name: string,
        avatar: string,
        avatarId?: string | null,
        joinMode?: 'ONLINE' | 'OFFLINE',
        avatarUrl?: string | null
      ) => {
        const sanitizedName = name
          .replace(/<[^>]*>/g, '')
          .trim()
          .slice(0, 20);
        const safeAvatar = truncateUtf16Safe(String(avatar ?? '').trim(), 12);
        if (!sanitizedName) {
          showNotification(
            getUiStrings(stateRef.current.uiLanguage).enterNameRequired ?? 'Name is required',
            'error'
          );
          return false;
        }
        if (!safeAvatar) {
          showNotification(
            getUiStrings(stateRef.current.uiLanguage).chooseAvatar ?? 'Choose an avatar',
            'error'
          );
          return false;
        }
        let playerData: { persistentId?: string; name?: string; avatar?: string } = {};
        try {
          const raw = localStorage.getItem('movli_player');
          if (raw) {
            const parsed = JSON.parse(raw) as unknown;
            if (parsed && typeof parsed === 'object') {
              playerData = parsed as { persistentId?: string; name?: string; avatar?: string };
            }
          }
        } catch {
          playerData = {};
        }
        if (!playerData.persistentId) {
          playerData.persistentId = crypto.randomUUID();
        }
        playerData.name = sanitizedName;
        playerData.avatar = safeAvatar;
        try {
          localStorage.setItem('movli_player', JSON.stringify(playerData));
        } catch {
          showNotification(
            getUiStrings(stateRef.current.uiLanguage).enterNameRequired ?? 'Storage error',
            'error'
          );
          return false;
        }

        const avatarIdForServer =
          avatarId != null && String(avatarId).trim() !== '' ? String(avatarId).slice(0, 3) : null;
        const avatarUrlForServer =
          avatarIdForServer == null && avatarUrl != null && String(avatarUrl).trim() !== ''
            ? String(avatarUrl).trim().slice(0, 512)
            : null;

        const effectiveMode =
          joinMode ?? (offlineJoinPendingRef.current ? 'OFFLINE' : stateRef.current.gameMode);

        if (effectiveMode === 'ONLINE') {
          const uiLang = stateRef.current.uiLanguage;
          try {
            if (stateRef.current.isHost) {
              await socketApi.createRoom(
                sanitizedName,
                safeAvatar,
                avatarIdForServer,
                avatarUrlForServer
              );
            } else {
              await socketApi.joinRoom(
                stateRef.current.roomCode,
                sanitizedName,
                safeAvatar,
                avatarIdForServer,
                avatarUrlForServer
              );
            }
            return true;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg === 'ROOM_OPERATION_TIMEOUT' || msg === 'NO_SOCKET') {
              showNotification(
                getUiStrings(uiLang).connectionFailed ?? 'Connection failed',
                'error'
              );
            }
            return false;
          }
        } else {
          offlineJoinPendingRef.current = false;
          dispatch({
            type: 'SET_STATE',
            payload: { myPlayerId: id, gameState: GameState.LOBBY },
          });
          dispatch({
            type: 'UPDATE_PLAYERS',
            payload: [
              ...stateRef.current.players.filter((p) => p.id !== id),
              {
                id,
                persistentId: playerData.persistentId ?? crypto.randomUUID(),
                name: sanitizedName,
                avatar: safeAvatar,
                ...(avatarId != null ? { avatarId } : {}),
                ...(avatarId == null && avatarUrlForServer
                  ? { avatarUrl: avatarUrlForServer }
                  : {}),
                isHost: true,
                stats: { explained: 0, guessed: 0 },
              },
            ],
          });
        }
        return true;
      },
      sendAction,
      playSound,
      showNotification,
      checkRoomExists: (code: string) => socketApi.checkRoomExists(code),
      setSettings: (s: GameSettings | ((prev: GameSettings) => GameSettings)) => {
        const newSettings = typeof s === 'function' ? s(stateRef.current.settings) : s;
        const mergedSettings: GameSettings = {
          ...stateRef.current.settings,
          ...newSettings,
          general: {
            ...stateRef.current.settings.general,
            ...(newSettings.general ?? {}),
          },
          mode: newSettings.mode
            ? ({ ...stateRef.current.settings.mode, ...newSettings.mode } as GameSettings['mode'])
            : stateRef.current.settings.mode,
        };

        // If we're online and host, propagate settings to server so other clients sync
        if (stateRef.current.gameMode === 'ONLINE') {
          if (stateRef.current.isHost) {
            if (!isOnlineRoomReady()) {
              notifyRoomNotReady();
              return;
            }
            pendingOptimisticSettingsRef.current = true;
            dispatch({ type: 'SET_STATE', payload: { settings: mergedSettings } });
            sendAction({ action: 'UPDATE_SETTINGS', data: newSettings });
          } else {
            // Non-hosts should not attempt to change global settings — apply locally for preview only
            dispatch({ type: 'SET_STATE', payload: { settings: mergedSettings } });
          }
        } else {
          // Offline/local mode — apply locally
          dispatch({ type: 'SET_STATE', payload: { settings: mergedSettings } });
        }
      },
      setPreferences: (patch: Partial<GameSettings['general']>) => {
        const { language, ...settingsPatch } = patch;
        const updates: Partial<AppState> = {};

        // language → personal UI language (not synced to room word deck)
        if (language !== undefined) {
          updates.uiLanguage = language;
        }
        // Other prefs (theme, sound, etc.) → settings only
        if (Object.keys(settingsPatch).length > 0) {
          updates.settings = {
            ...stateRef.current.settings,
            general: { ...stateRef.current.settings.general, ...settingsPatch },
          };
        }
        if (Object.keys(updates).length > 0) {
          dispatch({ type: 'SET_STATE', payload: updates });
        }
      },
      startOfflineGame: () => {
        // Ensure a clean slate when starting offline mode (prevents "host clones" after re-entry).
        try {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(ROOM_CODE_KEY);
          localStorage.removeItem(PLAYER_ID_KEY);
        } catch (_err) {
          void _err;
        }
        // Tear down any online socket room so stale sync cannot hijack offline flow.
        socketApi.leaveRoom();
        offlineJoinPendingRef.current = true;
        dispatch({
          type: 'SET_STATE',
          payload: {
            gameMode: 'OFFLINE',
            isHost: true,
            isConnected: true,
            gameState: GameState.ENTER_NAME,
            roomCode: '',
            myPlayerId: '',
            players: [],
            teams: [],
            connectionError: null,
            connectionErrorCode: null,
          },
        });
      },
      handleCorrect: () => sendAction({ action: 'CORRECT' }),
      handleSkip: () => sendAction({ action: 'SKIP' }),
      sendGuessOption: (selectedOption: string) =>
        sendAction({ action: 'GUESS_OPTION', data: { selectedOption } }),
      handleStartRound: () => sendAction({ action: 'START_ROUND' }),
      startGameplay: () => sendAction({ action: 'START_PLAYING' }),
      handleNextRound: () => sendAction({ action: 'NEXT_ROUND' }),
      togglePause: () => sendAction({ action: 'PAUSE_GAME' }),
      setTimeLeft: (val: number | ((p: number) => number)) => {
        const prev = stateRef.current.timeLeft;
        const next = typeof val === 'function' ? val(prev) : val;
        const clamped = Math.max(0, next);
        const mode = stateRef.current.settings.mode;
        const tickQuizRound =
          typeof val === 'function' &&
          stateRef.current.gameMode === 'OFFLINE' &&
          stateRef.current.gameState === GameState.PLAYING &&
          !stateRef.current.isPaused &&
          mode.gameMode === GameMode.QUIZ &&
          'quizTimerMode' in mode &&
          mode.quizTimerMode === 'PER_TASK';

        const payload: Partial<AppState> = { timeLeft: clamped };
        if (tickQuizRound) {
          const roundLeft = stateRef.current.quizRoundTimeLeft;
          if (roundLeft !== undefined && roundLeft > 0) {
            payload.quizRoundTimeLeft = Math.max(0, roundLeft - 1);
          }
        }
        if (
          stateRef.current.gameMode === 'OFFLINE' &&
          stateRef.current.gameState === GameState.PLAYING &&
          !stateRef.current.isPaused
        ) {
          if (clamped <= 0) {
            payload.timeUp = true;
            payload.roundEndsAt = undefined;
          } else {
            payload.roundEndsAt = Date.now() + clamped * 1000;
          }
        }
        dispatch({ type: 'SET_STATE', payload });
      },
      setTeams: (teams: Team[]) => dispatch({ type: 'SET_STATE', payload: { teams } }),
      resetGame: () => {
        sendAction({ action: 'RESET_GAME' });
      },
      rematch: () => sendAction({ action: 'REMATCH' }),
      leaveRoom: (opts?: { resetGameMode?: boolean }) => {
        const resetGameMode = opts?.resetGameMode ?? true;
        const nextGameMode = resetGameMode ? 'ONLINE' : stateRef.current.gameMode;
        // Prevent host session restore after refresh (and clear any stale join keys).
        try {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(ROOM_CODE_KEY);
          localStorage.removeItem(PLAYER_ID_KEY);
        } catch (_err) {
          void _err;
        }
        socketApi.leaveRoom();
        offlineJoinPendingRef.current = false;
        dispatch({
          type: 'SET_STATE',
          payload: {
            gameState: GameState.MENU,
            gameMode: nextGameMode,
            isHost: false,
            isConnected: false,
            roomCode: '',
            myPlayerId: '',
            players: [],
            teams: [],
            connectionError: null,
            connectionErrorCode: null,
          },
        });
      },
      setRoomCode: (c: string) =>
        dispatch({
          type: 'SET_STATE',
          payload: {
            roomCode: c,
            gameMode: 'ONLINE',
            isHost: false,
            connectionError: null,
            connectionErrorCode: null,
          },
        }),
      addOfflinePlayer: (name?: string, avatar?: string) =>
        sendAction({ action: 'ADD_OFFLINE_PLAYER', data: { name, avatar } }),
      removeOfflinePlayer: (id: string) =>
        sendAction({ action: 'REMOVE_OFFLINE_PLAYER', data: id }),
    }),
    [sendAction, playSound, showNotification, socketApi, isOnlineRoomReady, notifyRoomNotReady]
  );

  const telegramStartParam =
    typeof window !== 'undefined'
      ? (window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? null)
      : null;

  useTelegramLobbyDeepLink({
    isAuthenticated,
    startParam: telegramStartParam,
    gameState: state.gameState,
    uiLanguage: state.uiLanguage,
    setGameState: (gameState) => dispatch({ type: 'SET_STATE', payload: { gameState } }),
    setRoomCode: (roomCode) =>
      dispatch({
        type: 'SET_STATE',
        payload: {
          roomCode,
          gameMode: 'ONLINE',
          isHost: false,
          connectionError: null,
          connectionErrorCode: null,
        },
      }),
    checkRoomExists: socketApi.checkRoomExists,
    showNotification,
  });

  return (
    <GameStateContext.Provider value={gameStateValue}>
      <GameUIContext.Provider value={gameUIValue}>
        <GameActionsContext.Provider value={gameActionsValue}>
          {state.notification && (
            <ToastNotification
              {...state.notification}
              onClose={() => dispatch({ type: 'SHOW_NOTIF', payload: null })}
            />
          )}
          {children}
        </GameActionsContext.Provider>
      </GameUIContext.Provider>
    </GameStateContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const state = useContext(GameStateContext);
  const ui = useContext(GameUIContext);
  const actions = useContext(GameActionsContext);
  if (!state || !ui || !actions) throw new Error('useGame must be used within a GameProvider');
  return useMemo(() => ({ ...state, ...ui, ...actions }), [state, ui, actions]);
};

export const useGameState = (): GameStateContextValue => {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within a GameProvider');
  return ctx;
};

export const useGameUI = (): GameUIContextValue => {
  const ctx = useContext(GameUIContext);
  if (!ctx) throw new Error('useGameUI must be used within a GameProvider');
  return ctx;
};

export const useGameActions = (): GameActionsContextValue => {
  const ctx = useContext(GameActionsContext);
  if (!ctx) throw new Error('useGameActions must be used within a GameProvider');
  return ctx;
};
