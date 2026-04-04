import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  GameState,
  Language,
  Team,
  GameSettings,
  GameTask,
  Category,
  RoundStats,
  Player,
  AppTheme,
  GameActionPayload,
  SoundPreset,
  AppState,
  GameContextType,
  GameMode,
} from '../types';
import {
  MOCK_WORDS,
  TEAM_COLORS,
  THEME_CONFIG,
  TRANSLATIONS,
  ROOM_CODE_LENGTH,
} from '../constants';
import { useAudio } from '../hooks/useAudio';
import { useSocketConnection } from '../hooks/useSocketConnection';
import { ToastNotification } from '../components/Shared';
import { fetchLobbySettings, fetchDeckByCode, PLAYER_ID_KEY, ROOM_CODE_KEY } from '../services/api';
import type { GameSyncState, RoomErrorPayload } from '@alias/shared';

function buildOfflineTask(
  rawWord: string,
  remainingDeck: string[],
  mode: GameMode | undefined,
  taskId: string
): GameTask {
  const m = mode ?? GameMode.CLASSIC;
  if (m === GameMode.TRANSLATION) {
    const parts = rawWord.split('|');
    return {
      id: taskId,
      prompt: parts[0]?.trim() || rawWord,
      answer: parts[1]?.trim(),
    };
  }
  if (m === GameMode.QUIZ) {
    const correct = rawWord;
    const shuffled = [...remainingDeck].sort(() => Math.random() - 0.5);
    const distractors: string[] = [];
    for (const w of shuffled) {
      if (w !== correct && distractors.length < 3) distractors.push(w);
    }
    const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return { id: taskId, prompt: correct, answer: correct, options };
  }
  return { id: taskId, prompt: rawWord };
}

export const AVATARS = [
  '🐶',
  '🐱',
  '🐭',
  '🐹',
  '🐰',
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐯',
  '🦁',
  '🐮',
  '🐷',
  '🐸',
  '🐵',
  '🐔',
];

const SESSION_KEY = 'alias_active_session';
const PREFS_KEY = 'alias_preferences';

// States that are safe to restore (no active timers/countdowns)
const SAVABLE_STATES = new Set([
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

type Action =
  | { type: 'SET_STATE'; payload: Partial<AppState> }
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }
  | { type: 'SHOW_NOTIF'; payload: { message: string; type: 'info' | 'error' | 'success' } | null };

const initialState: AppState = {
  gameState: GameState.MENU,
  gameMode: 'ONLINE',
  settings: {
    language: Language.UA,
    roundTime: 60,
    scoreToWin: 30,
    skipPenalty: true,
    categories: [Category.GENERAL],
    soundEnabled: true,
    soundPreset: SoundPreset.FUN,
    teamCount: 2,
    theme: AppTheme.PREMIUM_DARK,
  },
  roomCode: '',
  isHost: false,
  myPlayerId: '',
  players: [],
  teams: [],
  currentTeamIndex: 0,
  wordDeck: [],
  currentWord: '',
  currentTask: null,
  currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: '', explainerName: '' },
  timeLeft: 0,
  isPaused: false,
  isConnected: false,
  notification: null,
  connectionError: null,
  connectionErrorCode: null,
};

function gameReducer(state: AppState, action: Action): AppState {
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

const GameContext = createContext<GameContextType | undefined>(undefined);

function restoreSession(init: AppState): AppState {
  // Always restore user preferences (theme, language, sound) regardless of active session
  try {
    const rawPrefs = localStorage.getItem(PREFS_KEY);
    if (rawPrefs) {
      const prefs = JSON.parse(rawPrefs);
      init = { ...init, settings: { ...init.settings, ...prefs } };
    }
  } catch {}

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
      settings: { ...init.settings, ...saved.settings },
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
  } catch {
    return init;
  }
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState, restoreSession);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const { play: playSound } = useAudio(state.settings);

  const showNotification = useCallback(
    (message: string, type: 'info' | 'error' | 'success' = 'info') => {
      dispatch({ type: 'SHOW_NOTIF', payload: { message, type } });
      setTimeout(() => dispatch({ type: 'SHOW_NOTIF', payload: null }), 3000);
    },
    []
  );

  // Handle URL parameters on mount (room join, custom deck deep link, Stripe redirects)
  useEffect(() => {
    if (stateRef.current.gameState !== GameState.MENU) return;
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
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
            const lang = stateRef.current.settings.language;
            dispatch({
              type: 'SET_STATE',
              payload: {
                settings: {
                  ...stateRef.current.settings,
                  customDeckCode: deck.accessCode ?? code,
                  customDeckName: deck.name,
                },
              },
            });
            showNotification(
              TRANSLATIONS[lang].customDeckDeepLinkSuccess.replace('{name}', deck.name),
              'success'
            );
          } catch {
            const lang = stateRef.current.settings.language;
            showNotification(TRANSLATIONS[lang].customDeckDeepLinkError, 'error');
          }
        }
        stripKeys.push('deck');
      }

      if (room && room.length === ROOM_CODE_LENGTH && /^\d+$/.test(room)) {
        dispatch({ type: 'SET_STATE', payload: { roomCode: room, gameState: GameState.ENTER_NAME } });
        stripKeys.push('room');
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
          timeLeft: state.timeLeft,
          isPaused: state.isPaused,
        })
      );
    } catch {}
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
    // intentionally omit state.timeLeft — see comment above
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

  // Fisher-Yates shuffle algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const offlineTaskIdRef = useRef(0);
  const offlineQuizLockTaskIdRef = useRef<string | null>(null);

  const nextWordLogic = useCallback(() => {
    offlineQuizLockTaskIdRef.current = null;
    const { settings, wordDeck } = stateRef.current;
    let deck = [...wordDeck];
    if (deck.length === 0) {
      const pool = settings.categories.flatMap((cat) => {
        if (cat === Category.CUSTOM && settings.customWords) {
          return settings.customWords
            .split(',')
            .map((w) => w.trim().replace(/<[^>]*>/g, ''))
            .filter(Boolean);
        }
        return MOCK_WORDS[settings.language][cat] || [];
      });

      const finalPool =
        pool.length > 0 ? pool : MOCK_WORDS[settings.language][Category.GENERAL] || [];
      deck = shuffleArray(finalPool);
    }
    const word = deck.pop() || 'Error';
    offlineTaskIdRef.current += 1;
    const taskId = `offline-${offlineTaskIdRef.current}-${Date.now()}`;
    const task = buildOfflineTask(word, deck, settings.gameMode, taskId);
    dispatch({
      type: 'SET_STATE',
      payload: { wordDeck: deck, currentWord: task.prompt, currentTask: task },
    });
  }, []);

  const handleGameAction = useCallback(
    (payload: GameActionPayload) => {
      if (!stateRef.current.isHost) return;

      switch (payload.action) {
        case 'CORRECT': {
          playSound('correct');
          const taskPrompt = stateRef.current.currentTask?.prompt ?? stateRef.current.currentWord;
          const taskId = stateRef.current.currentTask?.id;
          dispatch({
            type: 'SET_STATE',
            payload: {
              currentRoundStats: {
                ...stateRef.current.currentRoundStats,
                correct: stateRef.current.currentRoundStats.correct + 1,
                words: [
                  ...stateRef.current.currentRoundStats.words,
                  { word: taskPrompt, taskId, result: 'correct' },
                ],
              },
            },
          });
          if (stateRef.current.timeUp) {
            dispatch({
              type: 'SET_STATE',
              payload: { gameState: GameState.ROUND_SUMMARY, timeUp: false },
            });
          } else {
            nextWordLogic();
          }
          break;
        }
        case 'SKIP': {
          playSound('skip');
          const skipPrompt = stateRef.current.currentTask?.prompt ?? stateRef.current.currentWord;
          const skipTaskId = stateRef.current.currentTask?.id;
          dispatch({
            type: 'SET_STATE',
            payload: {
              currentRoundStats: {
                ...stateRef.current.currentRoundStats,
                skipped: stateRef.current.currentRoundStats.skipped + 1,
                words: [
                  ...stateRef.current.currentRoundStats.words,
                  { word: skipPrompt, taskId: skipTaskId, result: 'skipped' },
                ],
              },
            },
          });
          if (stateRef.current.timeUp) {
            dispatch({
              type: 'SET_STATE',
              payload: { gameState: GameState.ROUND_SUMMARY, timeUp: false },
            });
          } else if (stateRef.current.settings.gameMode === GameMode.HARDCORE) {
            dispatch({
              type: 'SET_STATE',
              payload: { gameState: GameState.ROUND_SUMMARY, timeUp: false },
            });
          } else {
            nextWordLogic();
          }
          break;
        }
        case 'GUESS_OPTION': {
          const { settings, currentTask, timeUp } = stateRef.current;
          if (settings.gameMode !== GameMode.QUIZ || !currentTask?.answer) break;
          const sel = payload.data.selectedOption;
          if (typeof sel !== 'string') break;
          if (offlineQuizLockTaskIdRef.current === currentTask.id) break;
          if (sel !== currentTask.answer) {
            playSound('skip');
            break;
          }
          offlineQuizLockTaskIdRef.current = currentTask.id;
          playSound('correct');
          dispatch({
            type: 'SET_STATE',
            payload: {
              currentRoundStats: {
                ...stateRef.current.currentRoundStats,
                correct: stateRef.current.currentRoundStats.correct + 1,
                words: [
                  ...stateRef.current.currentRoundStats.words,
                  {
                    word: currentTask.prompt,
                    taskId: currentTask.id,
                    result: 'guessed' as const,
                  },
                ],
              },
            },
          });
          if (timeUp) {
            dispatch({
              type: 'SET_STATE',
              payload: { gameState: GameState.ROUND_SUMMARY, timeUp: false },
            });
          } else {
            nextWordLogic();
          }
          break;
        }
        case 'START_ROUND': {
          const teams = stateRef.current.teams;
          const teamIdx = stateRef.current.currentTeamIndex;
          const team = teams[teamIdx];
          if (!team || team.players.length === 0) {
            dispatch({ type: 'SET_STATE', payload: { gameState: GameState.LOBBY } });
            break;
          }
          const playerIdx = Math.min(team.nextPlayerIndex, team.players.length - 1);
          const explainer = team.players[playerIdx];
          dispatch({
            type: 'SET_STATE',
            payload: {
              gameState: GameState.COUNTDOWN,
              currentRoundStats: {
                correct: 0,
                skipped: 0,
                words: [],
                teamId: team.id,
                explainerName: explainer.name,
                explainerId: explainer.id,
              },
            },
          });
          break;
        }
        case 'START_PLAYING':
          playSound('start');
          dispatch({
            type: 'SET_STATE',
            payload: {
              gameState: GameState.PLAYING,
              timeLeft: stateRef.current.settings.roundTime,
              isPaused: false,
              timeUp: false,
            },
          });
          nextWordLogic();
          break;
        case 'START_DUEL': {
          const duelPlayers = stateRef.current.players;
          const duelTeams: Team[] = duelPlayers.map((p, i) => ({
            id: `team-${i}`,
            name: p.name,
            score: 0,
            color: TEAM_COLORS[i % TEAM_COLORS.length].class,
            colorHex: TEAM_COLORS[i % TEAM_COLORS.length].hex,
            players: [p],
            nextPlayerIndex: 0,
          }));
          dispatch({
            type: 'SET_STATE',
            payload: { teams: duelTeams, gameState: GameState.VS_SCREEN },
          });
          break;
        }
        case 'GENERATE_TEAMS': {
          const teamNames = TRANSLATIONS[stateRef.current.settings.language].teamNames;
          const teamCount = Math.min(
            stateRef.current.settings.teamCount,
            stateRef.current.players.length
          );
          const newTeams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
            id: `team-${i}`,
            name: teamNames[i % teamNames.length],
            score: 0,
            color: TEAM_COLORS[i % TEAM_COLORS.length].class,
            colorHex: TEAM_COLORS[i % TEAM_COLORS.length].hex,
            players: [],
            nextPlayerIndex: 0,
          }));
          const shuffledPlayers = shuffleArray([...stateRef.current.players]);
          shuffledPlayers.forEach((p, i) => newTeams[i % newTeams.length].players.push(p));
          dispatch({ type: 'SET_STATE', payload: { teams: newTeams, gameState: GameState.TEAMS } });
          break;
        }
        case 'START_GAME':
          dispatch({
            type: 'SET_STATE',
            payload: { gameState: GameState.PRE_ROUND, currentTeamIndex: 0 },
          });
          break;
        case 'NEXT_ROUND':
          if (stateRef.current.teams.length === 0) break;
          dispatch({
            type: 'SET_STATE',
            payload: {
              gameState: GameState.PRE_ROUND,
              currentTeamIndex:
                (stateRef.current.currentTeamIndex + 1) % stateRef.current.teams.length,
            },
          });
          break;
        case 'PAUSE_GAME':
          dispatch({ type: 'SET_STATE', payload: { isPaused: !stateRef.current.isPaused } });
          break;
        case 'UPDATE_SETTINGS':
          dispatch({
            type: 'SET_STATE',
            payload: { settings: { ...stateRef.current.settings, ...payload.data } },
          });
          break;
        case 'RESET_GAME':
          dispatch({
            type: 'SET_STATE',
            payload: {
              gameState: GameState.LOBBY,
              teams: [],
              currentTeamIndex: 0,
              currentWord: '',
              currentTask: null,
              wordDeck: [],
              timeLeft: 0,
              isPaused: false,
              currentRoundStats: initialState.currentRoundStats,
            },
          });
          localStorage.removeItem('alias_active_session');
          break;
        case 'REMATCH': {
          const remTeams = stateRef.current.teams.map((t) => ({
            ...t,
            score: 0,
            nextPlayerIndex: 0,
          }));
          dispatch({
            type: 'SET_STATE',
            payload: {
              teams: remTeams,
              gameState: GameState.PRE_ROUND,
              currentTeamIndex: 0,
              wordDeck: [],
              currentWord: '',
              currentTask: null,
            },
          });
          break;
        }
        case 'KICK_PLAYER': {
          const kickedPlayerId = payload.data;
          const updatedPlayers = stateRef.current.players.filter((p) => p.id !== kickedPlayerId);
          const updatedTeams = stateRef.current.teams.map((team) => {
            const newPlayers = team.players.filter((p) => p.id !== kickedPlayerId);
            return {
              ...team,
              players: newPlayers,
              nextPlayerIndex:
                team.nextPlayerIndex >= newPlayers.length
                  ? Math.max(0, newPlayers.length - 1)
                  : team.nextPlayerIndex,
            };
          });
          dispatch({
            type: 'SET_STATE',
            payload: { players: updatedPlayers, teams: updatedTeams },
          });
          break;
        }
        case 'TIME_UP': {
          playSound('end');
          dispatch({
            type: 'SET_STATE',
            payload: { gameState: GameState.ROUND_SUMMARY, timeLeft: 0 },
          });
          break;
        }
        case 'CONFIRM_ROUND': {
          const { currentRoundStats, teams, currentTeamIndex, settings } = stateRef.current;
          const rawPoints =
            currentRoundStats.correct - (settings.skipPenalty ? currentRoundStats.skipped : 0);
          const points = Math.max(0, rawPoints);

          const activeTeam = teams[currentTeamIndex];
          const updatedTeams = teams.map((t) => {
            let updated = { ...t };
            if (t.id === currentRoundStats.teamId) {
              updated.score = Math.max(0, t.score + points);
            }
            if (activeTeam && t.id === activeTeam.id) {
              updated.nextPlayerIndex = (t.nextPlayerIndex + 1) % (t.players.length || 1);
            }
            return updated;
          });

          const isLastTeam = currentTeamIndex === teams.length - 1;
          const hasWinner = updatedTeams.some((t) => t.score >= settings.scoreToWin);
          const nextState = isLastTeam && hasWinner ? GameState.GAME_OVER : GameState.SCOREBOARD;

          dispatch({ type: 'SET_STATE', payload: { teams: updatedTeams, gameState: nextState } });
          break;
        }
        case 'ADD_OFFLINE_PLAYER': {
          const { players } = stateRef.current;
          const playerNum = players.length + 1;
          const newPlayer: Player = {
            id: `local-${playerNum}-${Date.now()}`,
            name:
              payload.data?.name ||
              `${TRANSLATIONS[stateRef.current.settings.language].playerN} ${playerNum}`,
            avatar: payload.data?.avatar || AVATARS[playerNum % AVATARS.length],
            isHost: false,
            stats: { explained: 0, guessed: 0 },
          };
          dispatch({ type: 'UPDATE_PLAYERS', payload: [...players, newPlayer] });
          break;
        }
        case 'REMOVE_OFFLINE_PLAYER': {
          const removeId = payload.data;
          const filteredPlayers = stateRef.current.players.filter((p) => p.id !== removeId);
          dispatch({ type: 'UPDATE_PLAYERS', payload: filteredPlayers });
          break;
        }
      }
    },
    [playSound, nextWordLogic]
  );

  // Socket.io connection for server-based online mode
  const socketApi = useSocketConnection({
    onStateSync: useCallback((syncState: GameSyncState) => {
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

      // Налаштування кімнати (theme, language, sound) — хост керує ними через UPDATE_SETTINGS.
      // Синхронізуємо з сервером, щоб зміни хоста застосовувались у всіх.
      const settings = { ...syncState.settings };

      // Критично: isHost має оновлюватися з сервера при кожному sync (наприклад після міграції хоста)
      const myId = socketApi.myPlayerIdRef.current ?? stateRef.current.myPlayerId;
      const me = syncState.players.find((p) => p.id === myId);
      const isHostFromSync = me?.isHost ?? stateRef.current.isHost;

      dispatch({
        type: 'SET_STATE',
        payload: {
          gameState: keepClientNav ? currentClientState : syncState.gameState,
          settings,
          roomCode: syncState.roomCode,
          players: syncState.players,
          teams: syncState.teams,
          currentTeamIndex: syncState.currentTeamIndex,
          currentWord: syncState.currentWord,
          currentTask: syncState.currentTask ?? null,
          currentRoundStats: syncState.currentRoundStats,
          timeLeft: syncState.timeLeft,
          isPaused: syncState.isPaused,
          timeUp: syncState.timeUp,
          wordDeck: syncState.wordDeck,
          isHost: isHostFromSync,
          isConnected: true,
          connectionError: null,
          connectionErrorCode: null,
        },
      });
    }, []),
    onPlayerJoined: useCallback(
      (player: Player) => {
        showNotification(`${player.name} приєднався`, 'info');
      },
      [showNotification]
    ),
    onPlayerLeft: useCallback(
      (playerId: string) => {
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
        dispatch({
          type: 'SET_STATE',
          payload: { connectionError: err.message, connectionErrorCode: err.code },
        });
        showNotification(err.message, 'error');
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
          isConnected: true,
          connectionError: null,
          connectionErrorCode: null,
        },
      });
    }, []),
  });

  // Після повного reload сокет не підключений, але ключі rejoin уже в localStorage —
  // інакше `room:rejoin` у useSocketConnection ніколи не виконається.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedRoom = localStorage.getItem(ROOM_CODE_KEY);
      const storedPlayer = localStorage.getItem(PLAYER_ID_KEY);
      if (!storedRoom || !storedPlayer) return;
      socketApi.connect();
    } catch {
      /* ignore */
    }
  }, [socketApi.connect]);

  const sendAction = useCallback(
    (action: GameActionPayload) => {
      if (state.gameMode === 'ONLINE') {
        socketApi.sendGameAction(action);
      } else {
        handleGameAction(action);
      }
    },
    [state.gameMode, handleGameAction, socketApi.sendGameAction]
  );

  // Sync socket connection state back to app state
  useEffect(() => {
    if (state.gameMode !== 'ONLINE') return;
    if (socketApi.myPlayerId && socketApi.myPlayerId !== state.myPlayerId) {
      dispatch({ type: 'SET_STATE', payload: { myPlayerId: socketApi.myPlayerId } });
    }
    if (socketApi.roomCode && socketApi.roomCode !== state.roomCode) {
      dispatch({ type: 'SET_STATE', payload: { roomCode: socketApi.roomCode } });
    }
  }, [socketApi.myPlayerId, socketApi.roomCode, state.gameMode]);

  const currentTheme = useMemo(() => THEME_CONFIG[state.settings.theme], [state.settings.theme]);

  // Apply per-theme design tokens via CSS custom properties
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--font-heading', currentTheme.fonts.heading);
    r.style.setProperty('--font-body', currentTheme.fonts.body);
    r.style.setProperty('--theme-radius', currentTheme.borderRadius);

    // Theme-safe semantic colors for base components (Button/Card fallbacks, etc.)
    if (currentTheme.isDark) {
      r.style.setProperty('--ui-bg', '#020617'); // slate-950
      r.style.setProperty('--ui-fg', 'rgba(255,255,255,0.92)');
      r.style.setProperty('--ui-fg-muted', 'rgba(255,255,255,0.55)');
      r.style.setProperty('--ui-border', 'rgba(255,255,255,0.12)');
      r.style.setProperty('--ui-surface', 'rgba(255,255,255,0.06)');
      r.style.setProperty('--ui-surface-hover', 'rgba(255,255,255,0.10)');
      r.style.setProperty('--ui-card', 'rgba(15,23,42,0.55)'); // slate-900 tint
    } else {
      r.style.setProperty('--ui-bg', '#F8FAFC'); // slate-50
      r.style.setProperty('--ui-fg', '#0F172A'); // slate-900
      r.style.setProperty('--ui-fg-muted', 'rgba(15,23,42,0.65)');
      r.style.setProperty('--ui-border', 'rgba(15,23,42,0.14)');
      r.style.setProperty('--ui-surface', 'rgba(15,23,42,0.06)');
      r.style.setProperty('--ui-surface-hover', 'rgba(15,23,42,0.10)');
      r.style.setProperty('--ui-card', 'rgba(255,255,255,0.90)');
    }
  }, [currentTheme]);

  // Sync <html lang> with app language setting
  useEffect(() => {
    const lang =
      state.settings.language === Language.UA
        ? 'uk'
        : state.settings.language === Language.DE
          ? 'de'
          : 'en';
    document.documentElement.lang = lang;
  }, [state.settings.language]);

  // Persist user preferences (theme, language, sound) across sessions
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          theme: state.settings.theme,
          language: state.settings.language,
          soundEnabled: state.settings.soundEnabled,
          soundPreset: state.settings.soundPreset,
        })
      );
    } catch {}
  }, [
    state.settings.theme,
    state.settings.language,
    state.settings.soundEnabled,
    state.settings.soundPreset,
  ]);

  const contextValue = useMemo(
    () => ({
      ...state,
      isReconnecting: socketApi.isReconnecting,
      currentTheme,
      setGameState: (s: GameState) => {
        dispatch({ type: 'SET_STATE', payload: { gameState: s } });
      },
      createNewRoom: () => {
        dispatch({
          type: 'SET_STATE',
          payload: {
            isHost: true,
            gameState: GameState.ENTER_NAME,
            gameMode: 'ONLINE',
            connectionError: null,
            connectionErrorCode: null,
          },
        });
        // Auto-apply saved lobby settings (roundTime, categories, etc.) but keep
        // personal preferences (theme, language, sound) from the user's device.
        fetchLobbySettings()
          .then((saved) => {
            if (saved && typeof saved === 'object') {
              const {
                theme: _t,
                language: _l,
                soundEnabled: _se,
                soundPreset: _sp,
                ...roomSettings
              } = saved as Partial<GameSettings>;
              dispatch({
                type: 'SET_STATE',
                payload: { settings: { ...stateRef.current.settings, ...roomSettings } },
              });
            }
          })
          .catch(() => {});
      },
      handleJoin: (id: string, name: string, avatar: string, avatarId?: string | null) => {
        const sanitizedName = name.replace(/<[^>]*>/g, '').slice(0, 20);
        let playerData = JSON.parse(localStorage.getItem('alias_player') || '{}');
        if (!playerData.persistentId) {
          playerData.persistentId = crypto.randomUUID();
        }
        playerData.name = sanitizedName;
        playerData.avatar = avatar;
        localStorage.setItem('alias_player', JSON.stringify(playerData));

        if (stateRef.current.gameMode === 'ONLINE') {
          // Server-based online mode
          if (stateRef.current.isHost) {
            socketApi.createRoom(sanitizedName, avatar, avatarId);
            dispatch({ type: 'SET_STATE', payload: { gameState: GameState.LOBBY } });
          } else {
            socketApi.joinRoom(stateRef.current.roomCode, sanitizedName, avatar, avatarId);
            dispatch({ type: 'SET_STATE', payload: { gameState: GameState.LOBBY } });
          }
        } else {
          // Offline mode: local player management
          dispatch({ type: 'SET_STATE', payload: { myPlayerId: id } });
          dispatch({
            type: 'UPDATE_PLAYERS',
            payload: [
              ...stateRef.current.players.filter((p) => p.id !== id),
              {
                id,
                persistentId: playerData.persistentId,
                name: sanitizedName,
                avatar,
                ...(avatarId != null ? { avatarId } : {}),
                isHost: true,
                stats: { explained: 0, guessed: 0 },
              },
            ],
          });
        }
      },
      sendAction,
      playSound,
      showNotification,
      setSettings: (s: GameSettings | ((prev: GameSettings) => GameSettings)) => {
        const newSettings = typeof s === 'function' ? s(stateRef.current.settings) : s;
        // If we're online and host, propagate settings to server so other clients sync
        if (stateRef.current.gameMode === 'ONLINE') {
          if (stateRef.current.isHost) {
            sendAction({ action: 'UPDATE_SETTINGS', data: newSettings });
          } else {
            // Non-hosts should not attempt to change global settings — apply locally for preview only
            dispatch({
              type: 'SET_STATE',
              payload: { settings: { ...stateRef.current.settings, ...newSettings } },
            });
          }
        } else {
          // Offline/local mode — apply locally
          dispatch({
            type: 'SET_STATE',
            payload: { settings: { ...stateRef.current.settings, ...newSettings } },
          });
        }
      },
      startOfflineGame: () => {
        dispatch({
          type: 'SET_STATE',
          payload: {
            gameMode: 'OFFLINE',
            isHost: true,
            isConnected: true,
            gameState: GameState.ENTER_NAME,
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
        const next = typeof val === 'function' ? val(stateRef.current.timeLeft) : val;
        const payload: Record<string, unknown> = { timeLeft: Math.max(0, next) };
        if (
          next <= 0 &&
          stateRef.current.gameState === GameState.PLAYING &&
          stateRef.current.gameMode === 'OFFLINE'
        ) {
          payload.timeUp = true;
        }
        dispatch({ type: 'SET_STATE', payload });
      },
      setTeams: (teams: Team[]) => dispatch({ type: 'SET_STATE', payload: { teams } }),
      resetGame: () => {
        sendAction({ action: 'RESET_GAME' });
      },
      rematch: () => sendAction({ action: 'REMATCH' }),
      leaveRoom: () => {
        socketApi.leaveRoom();
        dispatch({
          type: 'SET_STATE',
          payload: {
            gameState: GameState.MENU,
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
    [state, currentTheme, sendAction, playSound, showNotification, socketApi]
  );

  return (
    <GameContext.Provider value={contextValue}>
      {state.notification && (
        <ToastNotification
          {...state.notification}
          onClose={() => dispatch({ type: 'SHOW_NOTIF', payload: null })}
        />
      )}
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
