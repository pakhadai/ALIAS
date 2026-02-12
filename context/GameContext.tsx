
import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  GameState, Language, Team, GameSettings, Category, RoundStats,
  Player, AppTheme, GameActionPayload, SoundPreset, AppState, GameContextType
} from '../types';
import {
  MOCK_WORDS, TEAM_COLORS, THEME_CONFIG, TRANSLATIONS,
  BROADCAST_DEBOUNCE_MS, RECONNECT_MAX_TIME_S, ROOM_CODE_LENGTH
} from '../constants';
import { useAudio } from '../hooks/useAudio';
import { usePeerConnection } from '../hooks/usePeerConnection';
import { ToastNotification } from '../components/Shared';

export const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'];

type Action =
  | { type: 'SET_STATE', payload: Partial<AppState> }
  | { type: 'UPDATE_PLAYERS', payload: Player[] }
  | { type: 'SHOW_NOTIF', payload: { message: string, type: 'info' | 'error' | 'success' } | null };

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
    theme: AppTheme.PREMIUM_DARK
  },
  roomCode: '',
  isHost: false,
  myPlayerId: '',
  players: [],
  teams: [],
  currentTeamIndex: 0,
  wordDeck: [],
  currentWord: '',
  currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: '', explainerName: '' },
  timeLeft: 0,
  isPaused: false,
  isConnected: false,
  isHostReconnecting: false,
  reconnectTimeLeft: RECONNECT_MAX_TIME_S,
  notification: null,
  peerError: null
};

function gameReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE': return { ...state, ...action.payload };
    case 'UPDATE_PLAYERS': return { ...state, players: action.payload };
    case 'SHOW_NOTIF': return { ...state, notification: action.payload };
    default: return state;
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const { play: playSound } = useAudio(state.settings);

  const showNotification = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    dispatch({ type: 'SHOW_NOTIF', payload: { message, type } });
    setTimeout(() => dispatch({ type: 'SHOW_NOTIF', payload: null }), 3000);
  }, []);

  // Handle URL room parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && room.length === ROOM_CODE_LENGTH && /^\d+$/.test(room)) {
      dispatch({ type: 'SET_STATE', payload: { roomCode: room, gameState: GameState.ENTER_NAME } });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fisher-Yates shuffle algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const nextWordLogic = useCallback(() => {
    const { settings, wordDeck } = stateRef.current;
    let deck = [...wordDeck];
    if (deck.length === 0) {
      const pool = settings.categories.flatMap(cat => {
        if (cat === Category.CUSTOM && settings.customWords) {
          return settings.customWords.split(',').map(w => w.trim().replace(/<[^>]*>/g, '')).filter(Boolean);
        }
        return MOCK_WORDS[settings.language][cat] || [];
      });

      const finalPool = pool.length > 0 ? pool : MOCK_WORDS[settings.language][Category.GENERAL] || [];
      deck = shuffleArray(finalPool);
    }
    const word = deck.pop() || 'Error';
    dispatch({ type: 'SET_STATE', payload: { wordDeck: deck, currentWord: word } });
  }, []);

  const broadcastStateRef = useRef<() => void>(() => {});
  const kickConnectionRef = useRef<(playerId: string) => void>(() => {});

  const handleGameAction = useCallback((payload: GameActionPayload) => {
    if (!stateRef.current.isHost) return;

    switch (payload.action) {
      case 'CORRECT':
        playSound('correct');
        dispatch({ type: 'SET_STATE', payload: {
          currentRoundStats: {
            ...stateRef.current.currentRoundStats,
            correct: stateRef.current.currentRoundStats.correct + 1,
            words: [...stateRef.current.currentRoundStats.words, { word: stateRef.current.currentWord, result: 'correct' }]
          }
        }});
        nextWordLogic();
        break;
      case 'SKIP':
        playSound('skip');
        dispatch({ type: 'SET_STATE', payload: {
          currentRoundStats: {
            ...stateRef.current.currentRoundStats,
            skipped: stateRef.current.currentRoundStats.skipped + 1,
            words: [...stateRef.current.currentRoundStats.words, { word: stateRef.current.currentWord, result: 'skipped' }]
          }
        }});
        nextWordLogic();
        break;
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
        dispatch({ type: 'SET_STATE', payload: {
          gameState: GameState.COUNTDOWN,
          currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: team.id, explainerName: explainer.name, explainerId: explainer.id }
        }});
        break;
      }
      case 'START_PLAYING':
        playSound('start');
        dispatch({ type: 'SET_STATE', payload: { gameState: GameState.PLAYING, timeLeft: stateRef.current.settings.roundTime, isPaused: false } });
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
          nextPlayerIndex: 0
        }));
        dispatch({ type: 'SET_STATE', payload: { teams: duelTeams, gameState: GameState.VS_SCREEN } });
        break;
      }
      case 'GENERATE_TEAMS': {
        const teamNames = TRANSLATIONS[stateRef.current.settings.language].teamNames;
        const teamCount = Math.min(stateRef.current.settings.teamCount, stateRef.current.players.length);
        const newTeams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
          id: `team-${i}`,
          name: teamNames[i % teamNames.length],
          score: 0,
          color: TEAM_COLORS[i % TEAM_COLORS.length].class,
          colorHex: TEAM_COLORS[i % TEAM_COLORS.length].hex,
          players: [],
          nextPlayerIndex: 0
        }));
        const shuffledPlayers = shuffleArray([...stateRef.current.players]);
        shuffledPlayers.forEach((p, i) => newTeams[i % newTeams.length].players.push(p));
        dispatch({ type: 'SET_STATE', payload: { teams: newTeams, gameState: GameState.TEAMS } });
        break;
      }
      case 'START_GAME':
        dispatch({ type: 'SET_STATE', payload: { gameState: GameState.PRE_ROUND, currentTeamIndex: 0 } });
        break;
      case 'NEXT_ROUND':
        dispatch({ type: 'SET_STATE', payload: {
          gameState: GameState.PRE_ROUND,
          currentTeamIndex: (stateRef.current.currentTeamIndex + 1) % stateRef.current.teams.length
        }});
        break;
      case 'PAUSE_GAME':
        dispatch({ type: 'SET_STATE', payload: { isPaused: !stateRef.current.isPaused } });
        break;
      case 'UPDATE_SETTINGS':
        dispatch({ type: 'SET_STATE', payload: { settings: { ...stateRef.current.settings, ...payload.data } } });
        break;
      case 'RESET_GAME':
        dispatch({ type: 'SET_STATE', payload: {
          gameState: GameState.LOBBY,
          teams: [],
          currentTeamIndex: 0,
          currentWord: '',
          wordDeck: [],
          timeLeft: 0,
          isPaused: false,
          currentRoundStats: initialState.currentRoundStats
        }});
        localStorage.removeItem('alias_active_session');
        break;
      case 'REMATCH': {
        const remTeams = stateRef.current.teams.map(t => ({ ...t, score: 0, nextPlayerIndex: 0 }));
        dispatch({ type: 'SET_STATE', payload: { teams: remTeams, gameState: GameState.PRE_ROUND, currentTeamIndex: 0, wordDeck: [], currentWord: '' } });
        break;
      }
      case 'KICK_PLAYER': {
        const kickedPlayerId = payload.data;
        kickConnectionRef.current(kickedPlayerId);
        const updatedPlayers = stateRef.current.players.filter(p => p.id !== kickedPlayerId);
        const updatedTeams = stateRef.current.teams.map(team => {
          const newPlayers = team.players.filter(p => p.id !== kickedPlayerId);
          return {
            ...team,
            players: newPlayers,
            nextPlayerIndex: team.nextPlayerIndex >= newPlayers.length
              ? Math.max(0, newPlayers.length - 1)
              : team.nextPlayerIndex
          };
        });
        dispatch({ type: 'SET_STATE', payload: { players: updatedPlayers, teams: updatedTeams } });
        break;
      }
      case 'TIME_UP': {
        playSound('end');
        dispatch({ type: 'SET_STATE', payload: { gameState: GameState.ROUND_SUMMARY, timeLeft: 0 } });
        break;
      }
      case 'CONFIRM_ROUND': {
        const { currentRoundStats, teams, currentTeamIndex, settings } = stateRef.current;
        const rawPoints = currentRoundStats.correct - (settings.skipPenalty ? currentRoundStats.skipped : 0);
        const points = Math.max(0, rawPoints);

        const activeTeam = teams[currentTeamIndex];
        const updatedTeams = teams.map(t => {
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
        const hasWinner = updatedTeams.some(t => t.score >= settings.scoreToWin);
        const nextState = (isLastTeam && hasWinner) ? GameState.GAME_OVER : GameState.SCOREBOARD;

        dispatch({ type: 'SET_STATE', payload: { teams: updatedTeams, gameState: nextState } });
        break;
      }
      case 'ADD_OFFLINE_PLAYER': {
        const { players } = stateRef.current;
        const playerNum = players.length + 1;
        const newPlayer: Player = {
          id: `local-${playerNum}-${Date.now()}`,
          name: payload.data?.name || `${TRANSLATIONS[stateRef.current.settings.language].playerN} ${playerNum}`,
          avatar: payload.data?.avatar || AVATARS[playerNum % AVATARS.length],
          isHost: false,
          stats: { explained: 0 }
        };
        dispatch({ type: 'UPDATE_PLAYERS', payload: [...players, newPlayer] });
        break;
      }
      case 'REMOVE_OFFLINE_PLAYER': {
        const removeId = payload.data;
        const filteredPlayers = stateRef.current.players.filter(p => p.id !== removeId);
        dispatch({ type: 'UPDATE_PLAYERS', payload: filteredPlayers });
        break;
      }
    }
    setTimeout(() => broadcastStateRef.current(), BROADCAST_DEBOUNCE_MS);
  }, [playSound, nextWordLogic]);

  const { broadcastState, hostConn, peerIdRef, sendJoinRequest, kickConnection } = usePeerConnection(state, dispatch, handleGameAction, initialState);

  useEffect(() => {
    broadcastStateRef.current = broadcastState;
  }, [broadcastState]);

  useEffect(() => {
    kickConnectionRef.current = kickConnection;
  }, [kickConnection]);

  const sendAction = useCallback((action: GameActionPayload) => {
    if (stateRef.current.isHost) handleGameAction(action);
    else if (hostConn?.open) hostConn.send({ type: 'GAME_ACTION', payload: action });
  }, [handleGameAction, hostConn]);

  const currentTheme = useMemo(() => THEME_CONFIG[state.settings.theme], [state.settings.theme]);

  const contextValue = useMemo(() => ({
    ...state,
    currentTheme,
    setGameState: (s: GameState) => {
      dispatch({ type: 'SET_STATE', payload: { gameState: s } });
    },
    createNewRoom: () => dispatch({ type: 'SET_STATE', payload: { roomCode: Math.floor(10000 + Math.random() * 90000).toString(), isHost: true, gameState: GameState.ENTER_NAME, gameMode: 'ONLINE' } }),
    handleJoin: (id: string, name: string, avatar: string) => {
      const sanitizedName = name.replace(/<[^>]*>/g, '').slice(0, 20);
      let playerData = JSON.parse(localStorage.getItem('alias_player') || '{}');
      if (!playerData.persistentId) {
        playerData.persistentId = crypto.randomUUID();
      }
      playerData.name = sanitizedName;
      playerData.avatar = avatar;
      localStorage.setItem('alias_player', JSON.stringify(playerData));

      if (stateRef.current.isHost) {
        dispatch({ type: 'SET_STATE', payload: { myPlayerId: id } });
        dispatch({ type: 'UPDATE_PLAYERS', payload: [
          ...stateRef.current.players.filter(p => p.id !== id),
          { id, persistentId: playerData.persistentId, name: sanitizedName, avatar, isHost: true, stats: { explained: 0 } }
        ] });
      } else {
        // Use peer ID so it matches what the host stores from JOIN_REQUEST
        const myId = peerIdRef.current || id;
        dispatch({ type: 'SET_STATE', payload: { myPlayerId: myId } });
        // Send JOIN_REQUEST with correct player data to host
        sendJoinRequest({
          id: myId,
          name: sanitizedName,
          avatar,
          persistentId: playerData.persistentId
        });
      }
    },
    sendAction,
    playSound,
    showNotification,
    setSettings: (s: GameSettings | ((prev: GameSettings) => GameSettings)) => dispatch({ type: 'SET_STATE', payload: { settings: typeof s === 'function' ? s(state.settings) : s } }),
    startOfflineGame: () => {
      dispatch({ type: 'SET_STATE', payload: {
        gameMode: 'OFFLINE',
        isHost: true,
        isConnected: true,
        gameState: GameState.ENTER_NAME
      } });
    },
    handleCorrect: () => sendAction({ action: 'CORRECT' }),
    handleSkip: () => sendAction({ action: 'SKIP' }),
    handleStartRound: () => sendAction({ action: 'START_ROUND' }),
    startGameplay: () => sendAction({ action: 'START_PLAYING' }),
    handleNextRound: () => sendAction({ action: 'NEXT_ROUND' }),
    togglePause: () => sendAction({ action: 'PAUSE_GAME' }),
    setTimeLeft: (val: number | ((p: number) => number)) => {
        dispatch({ type: 'SET_STATE', payload: { timeLeft: typeof val === 'function' ? val(stateRef.current.timeLeft) : val } });
    },
    setTeams: (teams: Team[]) => dispatch({ type: 'SET_STATE', payload: { teams } }),
    resetGame: () => {
      sendAction({ action: 'RESET_GAME' });
    },
    rematch: () => sendAction({ action: 'REMATCH' }),
    setRoomCode: (c: string) => dispatch({ type: 'SET_STATE', payload: { roomCode: c, gameMode: 'ONLINE', isHost: false } }),
    addOfflinePlayer: (name?: string, avatar?: string) => sendAction({ action: 'ADD_OFFLINE_PLAYER', data: { name, avatar } }),
    removeOfflinePlayer: (id: string) => sendAction({ action: 'REMOVE_OFFLINE_PLAYER', data: id }),
  }), [state, currentTheme, sendAction, playSound, showNotification, sendJoinRequest]);

  return (
    <GameContext.Provider value={contextValue}>
      {state.notification && <ToastNotification {...state.notification} onClose={() => dispatch({ type: 'SHOW_NOTIF', payload: null })} />}
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};
