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
import { truncateUtf16Safe } from '../utils/utf16';
import { bestTextOnColor } from '../utils/color';
import { buildOfflineTask } from '../utils/gameTask';
import { AVATARS } from '../utils/avatars';
export { AVATARS };
import {
  SESSION_KEY,
  PREFS_KEY,
  SAVABLE_STATES,
  type Action,
  initialState,
  gameReducer,
  restoreSession,
} from './gameReducer';

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState, restoreSession);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const { play: playSound } = useAudio(state.settings);

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, []);

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
            showNotification(
              TRANSLATIONS[stateRef.current.uiLanguage].customDeckDeepLinkSuccess.replace(
                '{name}',
                deck.name
              ),
              'success'
            );
          } catch {
            showNotification(
              TRANSLATIONS[stateRef.current.uiLanguage].customDeckDeepLinkError,
              'error'
            );
          }
        }
        stripKeys.push('deck');
      }

      if (room && room.length === ROOM_CODE_LENGTH && /^\d+$/.test(room)) {
        dispatch({
          type: 'SET_STATE',
          payload: { roomCode: room, gameState: GameState.ENTER_NAME },
        });
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
      // Offline mode: allow PAUSE_GAME from any local player.
      // (Other actions remain host-driven in offline mode.)
      if (!stateRef.current.isHost && payload.action !== 'PAUSE_GAME') return;

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
          } else if (stateRef.current.settings.mode.gameMode === GameMode.HARDCORE) {
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
          if (settings.mode.gameMode !== GameMode.QUIZ || !currentTask?.answer) break;
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
          const roundTime =
            'classicRoundTime' in stateRef.current.settings.mode
              ? stateRef.current.settings.mode.classicRoundTime
              : 0;
          dispatch({
            type: 'SET_STATE',
            payload: {
              gameState: GameState.PLAYING,
              timeLeft: roundTime,
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
          const teamNames = TRANSLATIONS[stateRef.current.uiLanguage].teamNames;
          const teamCount = Math.min(
            stateRef.current.settings.general.teamCount,
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
          if (stateRef.current.settings.mode.gameMode === GameMode.IMPOSTER) {
            const ps = stateRef.current.players;
            const imposter = ps[Math.floor(Math.random() * Math.max(1, ps.length))];
            const w = nextOfflineImposterWord();
            dispatch({
              type: 'SET_STATE',
              payload: {
                gameState: GameState.PRE_ROUND,
                currentTeamIndex: 0,
                imposterPhase: 'REVEAL',
                imposterPlayerId: imposter?.id,
                revealedPlayerIds: [],
                imposterOfflineRevealIndex: 0,
                imposterWord: w,
                imposterSecret: null,
                timeLeft: 0,
                isPaused: false,
                currentWord: '',
                currentTask: null,
              },
            });
          } else {
            dispatch({
              type: 'SET_STATE',
              payload: { gameState: GameState.PRE_ROUND, currentTeamIndex: 0 },
            });
          }
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
        case 'IMPOSTER_READY': {
          if (stateRef.current.settings.mode.gameMode !== GameMode.IMPOSTER) break;
          const { players, revealedPlayerIds, imposterOfflineRevealIndex } = stateRef.current;
          const current = players[imposterOfflineRevealIndex];
          if (!current) break;
          const nextRevealed = revealedPlayerIds.includes(current.id)
            ? revealedPlayerIds
            : [...revealedPlayerIds, current.id];
          const nextIndex = imposterOfflineRevealIndex + 1;
          const allRevealed = nextRevealed.length >= players.length;
          if (allRevealed) {
            const discussionTime =
              'imposterDiscussionTime' in stateRef.current.settings.mode
                ? stateRef.current.settings.mode.imposterDiscussionTime
                : 3 * 60;
            dispatch({
              type: 'SET_STATE',
              payload: {
                imposterPhase: 'DISCUSSION',
                revealedPlayerIds: nextRevealed,
                imposterOfflineRevealIndex: nextIndex,
                timeLeft: discussionTime,
                isPaused: false,
              },
            });
          } else {
            dispatch({
              type: 'SET_STATE',
              payload: {
                imposterPhase: 'REVEAL',
                revealedPlayerIds: nextRevealed,
                imposterOfflineRevealIndex: nextIndex,
              },
            });
          }
          break;
        }
        case 'IMPOSTER_END_GAME': {
          if (stateRef.current.settings.mode.gameMode !== GameMode.IMPOSTER) break;
          dispatch({ type: 'SET_STATE', payload: { imposterPhase: 'RESULTS', timeLeft: 0 } });
          break;
        }
        case 'UPDATE_SETTINGS':
          dispatch({
            type: 'SET_STATE',
            payload: {
              settings: {
                ...stateRef.current.settings,
                ...(payload.data.general
                  ? {
                      general: { ...stateRef.current.settings.general, ...payload.data.general },
                    }
                  : {}),
                ...(payload.data.mode
                  ? {
                      mode: (() => {
                        const prev = stateRef.current.settings.mode;
                        const patch = payload.data.mode;
                        const nextGameMode = patch.gameMode ?? prev.gameMode;
                        switch (nextGameMode) {
                          case GameMode.IMPOSTER:
                            return {
                              gameMode: GameMode.IMPOSTER,
                              imposterDiscussionTime:
                                patch.imposterDiscussionTime ??
                                (prev.gameMode === GameMode.IMPOSTER
                                  ? prev.imposterDiscussionTime
                                  : 3 * 60),
                            };
                          case GameMode.HARDCORE:
                            return {
                              gameMode: GameMode.HARDCORE,
                              classicRoundTime:
                                patch.classicRoundTime ??
                                (prev.gameMode !== GameMode.IMPOSTER ? prev.classicRoundTime : 60),
                            };
                          case GameMode.CLASSIC:
                          case GameMode.TRANSLATION:
                          case GameMode.SYNONYMS:
                          case GameMode.QUIZ:
                          default:
                            return {
                              gameMode: nextGameMode,
                              classicRoundTime:
                                patch.classicRoundTime ??
                                (prev.gameMode !== GameMode.IMPOSTER ? prev.classicRoundTime : 60),
                            };
                        }
                      })(),
                    }
                  : {}),
              },
            },
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
              imposterPhase: undefined,
              imposterPlayerId: undefined,
              revealedPlayerIds: [],
              imposterSecret: null,
              imposterOfflineRevealIndex: 0,
              imposterWord: null,
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
              wordDeck: stateRef.current.wordDeck,
              currentWord: '',
              currentTask: null,
              imposterPhase:
                stateRef.current.settings.mode.gameMode === GameMode.IMPOSTER
                  ? 'REVEAL'
                  : undefined,
              revealedPlayerIds: [],
              imposterSecret: null,
              imposterOfflineRevealIndex: 0,
              imposterWord:
                stateRef.current.settings.mode.gameMode === GameMode.IMPOSTER
                  ? nextOfflineImposterWord()
                  : null,
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
            currentRoundStats.correct -
            (settings.general.skipPenalty ? currentRoundStats.skipped : 0);
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
          const hasWinner = updatedTeams.some((t) => t.score >= settings.general.scoreToWin);
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
              `${TRANSLATIONS[stateRef.current.uiLanguage].playerN} ${playerNum}`,
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
      const myId = socketApi.myPlayerIdRef.current ?? stateRef.current.myPlayerId;
      const me = syncState.players.find((p) => p.id === myId);
      const isHostFromSync = me?.isHost ?? stateRef.current.isHost;

      const payload: Partial<AppState> = {
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
      // Validate before connecting to prevent "INVALID_PAYLOAD" rejoin errors.
      const ROOM_CODE_RE = /^\d{5}$/;
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!ROOM_CODE_RE.test(storedRoom) || !UUID_RE.test(storedPlayer)) {
        localStorage.removeItem(ROOM_CODE_KEY);
        localStorage.removeItem(PLAYER_ID_KEY);
        return;
      }
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

  const currentTheme = useMemo(() => {
    const fallback = THEME_CONFIG[AppTheme.PREMIUM_DARK];
    const themeId = state.settings.general.theme;
    const allowed = Object.prototype.hasOwnProperty.call(THEME_CONFIG, themeId);
    return allowed ? THEME_CONFIG[themeId] : fallback;
  }, [state.settings.general.theme]);

  // Hard-reset unknown themes to default (Midnight Ruby / PREMIUM_DARK)
  useEffect(() => {
    const themeId = state.settings.general.theme;
    const allowed = Object.prototype.hasOwnProperty.call(THEME_CONFIG, themeId);
    if (allowed) return;
    dispatch({
      type: 'SET_STATE',
      payload: {
        settings: {
          ...stateRef.current.settings,
          general: { ...stateRef.current.settings.general, theme: AppTheme.PREMIUM_DARK },
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
    r.style.colorScheme = currentTheme.isDark ? 'dark' : 'light';

    const tokens = currentTheme.tokens;
    if (tokens) {
      r.style.setProperty('--ui-bg', tokens.bg);
      r.style.setProperty('--ui-surface', tokens.surface);
      r.style.setProperty('--ui-border', tokens.border);
      r.style.setProperty('--ui-accent', tokens.accent);
      r.style.setProperty('--ui-fg', tokens.fg);

      r.style.setProperty(
        '--ui-fg-muted',
        tokens.fgMutedOpaque
          ? tokens.fgMuted
          : `color-mix(in_srgb, ${tokens.fgMuted} 70%, transparent)`
      );

      if (tokens.surfaceHoverColor) {
        r.style.setProperty('--ui-surface-hover', tokens.surfaceHoverColor);
      } else {
        const hoverAccent = tokens.accentSoft ?? tokens.accent;
        r.style.setProperty(
          '--ui-surface-hover',
          `color-mix(in_srgb, ${tokens.surface} 88%, ${hoverAccent} 12%)`
        );
      }

      const elevatedBase =
        tokens.elevated ?? `color-mix(in_srgb, ${tokens.surface} 72%, ${tokens.bg} 28%)`;
      r.style.setProperty('--ui-elevated', elevatedBase);
      r.style.setProperty(
        '--ui-card',
        tokens.elevated
          ? `color-mix(in_srgb, ${tokens.elevated} 88%, ${tokens.bg} 12%)`
          : `color-mix(in_srgb, ${tokens.surface} 70%, ${tokens.bg} 30%)`
      );
      r.style.setProperty('--ui-divider', tokens.divider ?? tokens.border);
      r.style.setProperty(
        '--ui-border-subtle',
        tokens.borderSubtle ?? `color-mix(in_srgb, ${tokens.border} 62%, ${tokens.bg} 38%)`
      );

      const accentSoftComputed =
        tokens.accentSoft ??
        (tokens.accentMuted
          ? tokens.accentMuted
          : `color-mix(in_srgb, ${tokens.accent} 58%, ${tokens.surface} 42%)`);
      r.style.setProperty('--ui-accent-soft', accentSoftComputed);
      r.style.setProperty('--ui-accent-muted', tokens.accentMuted ?? accentSoftComputed);
      r.style.setProperty(
        '--ui-accent-hover',
        tokens.accentHover ?? `color-mix(in_srgb, ${tokens.accent} 88%, #ffffff 12%)`
      );
      r.style.setProperty(
        '--ui-accent-pressed',
        tokens.accentPressed ?? `color-mix(in_srgb, ${tokens.accent} 82%, #000000 18%)`
      );
      r.style.setProperty(
        '--ui-accent-ring',
        tokens.accentRing ?? `color-mix(in_srgb, ${tokens.accent} 40%, transparent)`
      );

      r.style.setProperty(
        '--ui-accent-alt',
        tokens.accentAlt ?? `color-mix(in_srgb, ${tokens.accent} 65%, ${tokens.fg} 35%)`
      );
      r.style.setProperty('--ui-accent-warm', tokens.accentWarm ?? tokens.accent);
      r.style.setProperty(
        '--ui-accent-warm-soft',
        tokens.accentWarmSoft ??
          (tokens.accentWarm
            ? `color-mix(in_srgb, ${tokens.accentWarm} 72%, ${tokens.fg} 28%)`
            : `color-mix(in_srgb, ${tokens.accent} 72%, ${tokens.fg} 28%)`)
      );
      r.style.setProperty(
        '--ui-fg-subtle',
        tokens.fgSubtle
          ? tokens.fgSubtleOpaque
            ? tokens.fgSubtle
            : `color-mix(in_srgb, ${tokens.fgSubtle} 78%, transparent)`
          : `color-mix(in_srgb, ${tokens.fgMuted} 55%, transparent)`
      );
      r.style.setProperty(
        '--ui-fg-disabled',
        tokens.fgDisabled ?? `color-mix(in_srgb, ${tokens.fgMuted} 45%, transparent)`
      );
      r.style.setProperty('--ui-accent-contrast', bestTextOnColor(tokens.accent));
    }

    const accent = (tokens?.accent ?? currentTheme.preview?.accent ?? '#4A5C6A').trim();
    if (tokens?.success) {
      r.style.setProperty('--ui-success', tokens.success);
    } else {
      r.style.setProperty('--ui-success', `color-mix(in_srgb, ${accent} 10%, #22C55E 90%)`);
    }
    if (tokens?.warning) {
      r.style.setProperty('--ui-warning', tokens.warning);
    } else {
      r.style.setProperty('--ui-warning', `color-mix(in_srgb, ${accent} 10%, #F59E0B 90%)`);
    }
    if (tokens?.danger) {
      r.style.setProperty('--ui-danger', tokens.danger);
    } else {
      r.style.setProperty('--ui-danger', `color-mix(in_srgb, ${accent} 10%, #FF3B3B 90%)`);
    }

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
    } catch {}
  }, [
    state.settings.general.theme,
    state.settings.general.soundEnabled,
    state.settings.general.soundPreset,
    state.uiLanguage,
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
              const roomSettings = saved as Partial<GameSettings>;
              dispatch({
                type: 'SET_STATE',
                payload: {
                  settings: {
                    ...stateRef.current.settings,
                    ...(roomSettings.general
                      ? {
                          general: {
                            ...stateRef.current.settings.general,
                            ...roomSettings.general,
                            // Keep personal prefs from device
                            theme: stateRef.current.settings.general.theme,
                            soundEnabled: stateRef.current.settings.general.soundEnabled,
                            soundPreset: stateRef.current.settings.general.soundPreset,
                            // Default word deck language to the user's personal UI language
                            language: stateRef.current.uiLanguage,
                          },
                        }
                      : {}),
                    ...(roomSettings.mode ? { mode: roomSettings.mode as any } : {}),
                  },
                },
              });
            }
          })
          .catch(() => {});
      },
      handleJoin: async (id: string, name: string, avatar: string, avatarId?: string | null) => {
        const sanitizedName = name
          .replace(/<[^>]*>/g, '')
          .trim()
          .slice(0, 20);
        const safeAvatar = truncateUtf16Safe(String(avatar ?? '').trim(), 12);
        if (!sanitizedName) {
          showNotification(
            TRANSLATIONS[stateRef.current.uiLanguage].enterNameRequired ?? 'Name is required',
            'error'
          );
          return false;
        }
        if (!safeAvatar) {
          showNotification(
            TRANSLATIONS[stateRef.current.uiLanguage].chooseAvatar ?? 'Choose an avatar',
            'error'
          );
          return false;
        }
        let playerData: { persistentId?: string; name?: string; avatar?: string } = {};
        try {
          const raw = localStorage.getItem('alias_player');
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
          localStorage.setItem('alias_player', JSON.stringify(playerData));
        } catch {
          showNotification(
            TRANSLATIONS[stateRef.current.uiLanguage].enterNameRequired ?? 'Storage error',
            'error'
          );
          return false;
        }

        const avatarIdForServer =
          avatarId != null && String(avatarId).trim() !== '' ? String(avatarId).slice(0, 3) : null;

        if (state.gameMode === 'ONLINE') {
          const uiLang = state.uiLanguage;
          try {
            if (state.isHost) {
              await socketApi.createRoom(sanitizedName, safeAvatar, avatarIdForServer);
            } else {
              await socketApi.joinRoom(
                state.roomCode,
                sanitizedName,
                safeAvatar,
                avatarIdForServer
              );
            }
            return true;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg === 'ROOM_OPERATION_TIMEOUT' || msg === 'NO_SOCKET') {
              showNotification(
                TRANSLATIONS[uiLang].connectionFailed ?? 'Connection failed',
                'error'
              );
            }
            return false;
          }
        } else {
          dispatch({ type: 'SET_STATE', payload: { myPlayerId: id } });
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
        } catch {}
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
        // Prevent host session restore after refresh (and clear any stale join keys).
        try {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(ROOM_CODE_KEY);
          localStorage.removeItem(PLAYER_ID_KEY);
        } catch {}
        socketApi.leaveRoom();
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
