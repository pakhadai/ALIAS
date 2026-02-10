
import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  GameState, Language, Team, GameSettings, Category, RoundStats, 
  Player, AppTheme, GameActionPayload, SoundPreset, AppState
} from '../types';
import { 
  MOCK_WORDS, TEAM_COLORS, THEME_CONFIG, TRANSLATIONS, 
  BROADCAST_DEBOUNCE_MS, RECONNECT_MAX_TIME_S
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

const GameContext = createContext<any>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const { play: playSound } = useAudio(state.settings);

  const showNotification = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    dispatch({ type: 'SHOW_NOTIF', payload: { message, type } });
    setTimeout(() => dispatch({ type: 'SHOW_NOTIF', payload: null }), 3000);
  }, []);

  // Persist host state for recovery (Edge Case: Host closes tab)
  useEffect(() => {
    if (state.isHost && state.gameState !== GameState.MENU) {
      localStorage.setItem('alias_active_session', JSON.stringify({
        roomCode: state.roomCode,
        gameState: state.gameState,
        players: state.players,
        teams: state.teams,
        settings: state.settings,
        currentTeamIndex: state.currentTeamIndex
      }));
    }
  }, [state.isHost, state.gameState, state.roomCode, state.players, state.teams, state.settings, state.currentTeamIndex]);

  const nextWordLogic = useCallback(() => {
    const { settings, wordDeck } = stateRef.current;
    let deck = [...wordDeck];
    if (deck.length === 0) {
      const pool = settings.categories.flatMap(cat => {
        if (cat === Category.CUSTOM && settings.customWords) {
          return settings.customWords.split(',').map(w => w.trim()).filter(Boolean);
        }
        return MOCK_WORDS[settings.language][cat] || [];
      });
      
      // Fallback if deck is still empty (Edge Case: empty custom words)
      const finalPool = pool.length > 0 ? pool : MOCK_WORDS[settings.language][Category.GENERAL] || [];
      deck = finalPool.sort(() => Math.random() - 0.5);
    }
    const word = deck.pop() || 'Error';
    dispatch({ type: 'SET_STATE', payload: { wordDeck: deck, currentWord: word } });
  }, []);

  const broadcastStateRef = useRef<() => void>(() => {});

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
      case 'START_ROUND':
        const team = stateRef.current.teams[stateRef.current.currentTeamIndex];
        const explainer = team.players[team.nextPlayerIndex];
        dispatch({ type: 'SET_STATE', payload: {
          gameState: GameState.COUNTDOWN,
          currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: team.id, explainerName: explainer.name, explainerId: explainer.id }
        }});
        break;
      case 'START_PLAYING':
        playSound('start');
        dispatch({ type: 'SET_STATE', payload: { gameState: GameState.PLAYING, timeLeft: stateRef.current.settings.roundTime, isPaused: false } });
        nextWordLogic();
        break;
      case 'GENERATE_TEAMS':
        const teamNames = TRANSLATIONS[stateRef.current.settings.language].teamNames;
        const newTeams = Array.from({ length: stateRef.current.settings.teamCount }, (_, i) => ({
          id: `team-${i}`,
          name: teamNames[i % teamNames.length],
          score: 0,
          color: TEAM_COLORS[i % TEAM_COLORS.length].class,
          colorHex: TEAM_COLORS[i % TEAM_COLORS.length].hex,
          players: [],
          nextPlayerIndex: 0
        }));
        stateRef.current.players.forEach((p, i) => newTeams[i % newTeams.length].players.push(p));
        dispatch({ type: 'SET_STATE', payload: { teams: newTeams } });
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
          currentRoundStats: initialState.currentRoundStats
        }});
        break;
      case 'REMATCH':
        const remTeams = stateRef.current.teams.map(t => ({ ...t, score: 0, nextPlayerIndex: 0 }));
        dispatch({ type: 'SET_STATE', payload: { teams: remTeams, gameState: GameState.PRE_ROUND, currentTeamIndex: 0 } });
        break;
    }
    setTimeout(() => broadcastStateRef.current(), BROADCAST_DEBOUNCE_MS);
  }, [playSound, nextWordLogic]);

  const { broadcastState, hostConn } = usePeerConnection(state, dispatch, handleGameAction, initialState);

  useEffect(() => {
    broadcastStateRef.current = broadcastState;
  }, [broadcastState]);

  const sendAction = useCallback((action: GameActionPayload) => {
    if (stateRef.current.isHost) handleGameAction(action);
    else if (hostConn?.open) hostConn.send({ type: 'GAME_ACTION', payload: action });
  }, [handleGameAction, hostConn]);

  const currentTheme = useMemo(() => THEME_CONFIG[state.settings.theme], [state.settings.theme]);

  const contextValue = useMemo(() => ({
    ...state,
    currentTheme,
    setGameState: (s: GameState) => dispatch({ type: 'SET_STATE', payload: { gameState: s } }),
    createNewRoom: () => dispatch({ type: 'SET_STATE', payload: { roomCode: Math.floor(10000 + Math.random() * 90000).toString(), isHost: true, gameState: GameState.ENTER_NAME } }),
    handleJoin: (id: string, name: string, avatar: string) => {
      const sanitizedName = name.replace(/<[^>]*>/g, '').slice(0, 20);
      localStorage.setItem('alias_player', JSON.stringify({ name: sanitizedName, avatar }));
      dispatch({ type: 'SET_STATE', payload: { myPlayerId: id } });
      if (stateRef.current.isHost) dispatch({ type: 'UPDATE_PLAYERS', payload: [{ id, name: sanitizedName, avatar, isHost: true, stats: { explained: 0 } }] });
    },
    sendAction,
    playSound,
    showNotification,
    setSettings: (s: any) => dispatch({ type: 'SET_STATE', payload: { settings: typeof s === 'function' ? s(state.settings) : s } }),
    startOfflineGame: () => {
      const p = JSON.parse(localStorage.getItem('alias_player') || '{"name":"Player 1","avatar":"🐶"}');
      dispatch({ type: 'SET_STATE', payload: { gameMode: 'OFFLINE', isHost: true, isConnected: true, players: [{...p, id: 'local', isHost: true, stats: {explained:0}}], gameState: GameState.LOBBY } });
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
      localStorage.removeItem('alias_active_session');
      sendAction({ action: 'RESET_GAME' });
    },
    rematch: () => sendAction({ action: 'REMATCH' }),
    setRoomCode: (c: string) => dispatch({ type: 'SET_STATE', payload: { roomCode: c } })
  }), [state, currentTheme, sendAction, playSound, showNotification]);

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
