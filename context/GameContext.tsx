
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import Peer from 'peerjs';
import { 
  GameState, Language, Team, GameSettings, Category, RoundStats, 
  Player, AppTheme, NetworkMessage, GameActionPayload, SoundPreset, 
  ThemeConfig, PeerConnection 
} from '../types';
import { MOCK_WORDS, TEAM_COLORS, THEME_CONFIG, TRANSLATIONS } from '../constants';
import { playSoundEffect } from '../utils/audio';
import { ToastNotification } from '../components/Shared';

export const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', 
  '🐰', '🦊', '🐻', '🐼', 
  '🐨', '🐯', '🦁', '🐮', 
  '🐷', '🐸', '🐵', '🐔'
];

type GameMode = 'ONLINE' | 'OFFLINE';

interface GameContextType {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  roomCode: string;
  setRoomCode: (code: string) => void;
  isHost: boolean;
  setIsHost: (isHost: boolean) => void;
  myPlayerId: string;
  setMyPlayerId: (id: string) => void;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  currentTeamIndex: number;
  setCurrentTeamIndex: (index: number) => void;
  currentTheme: ThemeConfig;
  playSound: (type: 'correct' | 'skip' | 'start' | 'end' | 'tick' | 'win') => void;
  wordDeck: string[];
  setWordDeck: React.Dispatch<React.SetStateAction<string[]>>;
  currentWord: string;
  nextWord: () => void;
  currentRoundStats: RoundStats;
  setCurrentRoundStats: React.Dispatch<React.SetStateAction<RoundStats>>;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  isPaused: boolean;
  customWords: string[];
  setCustomWords: React.Dispatch<React.SetStateAction<string[]>>;
  isConnected: boolean;
  isHostReconnecting: boolean;
  reconnectTimeLeft: number;
  initializeWordDeck: () => void;
  generateTeams: () => void;
  resetGame: () => void;
  rematch: () => void;
  createNewRoom: () => void;
  startOfflineGame: () => void;
  handleCorrect: () => void;
  handleSkip: () => void;
  handleStartRound: () => void;
  startGameplay: () => void;
  handleNextRound: () => void;
  handleJoin: (id: string, name: string, avatar: string) => void;
  handleKickPlayer: (id: string) => void;
  togglePause: () => void;
  showNotification: (message: string, type?: 'info' | 'error' | 'success') => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const DEFAULT_SETTINGS: GameSettings = {
    language: Language.UA,
    roundTime: 60,
    scoreToWin: 30,
    skipPenalty: true,
    categories: [Category.GENERAL],
    soundEnabled: true,
    soundPreset: SoundPreset.FUN,
    teamCount: 2,
    theme: AppTheme.PREMIUM_DARK
};

const validateSettings = (saved: any): GameSettings => {
  const settings = { ...DEFAULT_SETTINGS, ...saved };
  if (!Object.values(Language).includes(settings.language)) settings.language = Language.UA;
  if (!Object.values(AppTheme).includes(settings.theme)) settings.theme = AppTheme.PREMIUM_DARK;
  if (!Object.values(SoundPreset).includes(settings.soundPreset)) settings.soundPreset = SoundPreset.FUN;
  if (!Array.isArray(settings.categories) || settings.categories.length === 0) settings.categories = [Category.GENERAL];
  return settings;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>('ONLINE');
  const [roomCode, setRoomCode] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [customWords, setCustomWords] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isHostReconnecting, setIsHostReconnecting] = useState(false);
  const [reconnectTimeLeft, setReconnectTimeLeft] = useState(60);
  const [notification, setNotification] = useState<{message: string, type: 'info' | 'error' | 'success'} | null>(null);
  
  const [settings, setSettings] = useState<GameSettings>(() => {
      try {
        const saved = localStorage.getItem('alias_settings');
        return saved ? validateSettings(JSON.parse(saved)) : DEFAULT_SETTINGS;
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
  });

  useEffect(() => {
    localStorage.setItem('alias_settings', JSON.stringify(settings));
  }, [settings]);

  // Handle URL Parameters for QR joins
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && room.length === 5 && gameState === GameState.MENU) {
      setRoomCode(room);
      setIsHost(false);
      setGameMode('ONLINE');
      setGameState(GameState.ENTER_NAME);
      // Clean URL to prevent re-triggers
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const [wordDeck, setWordDeck] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentRoundStats, setCurrentRoundStats] = useState<RoundStats>({
    correct: 0,
    skipped: 0,
    words: [],
    teamId: '',
    explainerName: ''
  });

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<PeerConnection[]>([]);
  const hostConnectionRef = useRef<PeerConnection | null>(null);
  const reconnectIntervalRef = useRef<number | null>(null);

  const stateRef = useRef({
      gameState, settings, players, teams, currentTeamIndex, 
      currentWord, timeLeft, currentRoundStats, wordDeck, isPaused, myPlayerId, customWords
  });

  useLayoutEffect(() => {
    stateRef.current = {
        gameState, settings, players, teams, currentTeamIndex, 
        currentWord, timeLeft, currentRoundStats, wordDeck, isPaused, myPlayerId, customWords
    };
  }, [gameState, settings, players, teams, currentTeamIndex, currentWord, timeLeft, currentRoundStats, wordDeck, isPaused, myPlayerId, customWords]);

  const currentTheme = THEME_CONFIG[settings.theme] || THEME_CONFIG[AppTheme.PREMIUM_DARK];

  const playSound = useCallback((type: 'correct' | 'skip' | 'start' | 'end' | 'tick' | 'win') => {
    const s = stateRef.current.settings;
    if (s.soundEnabled) playSoundEffect(type, s.soundPreset);
  }, []);

  const showNotification = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
      setNotification({ message, type });
  }, []);

  const generateRoomCode = () => {
    let code = '';
    const randomValues = new Uint32Array(5);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < 5; i++) {
        code += (randomValues[i] % 10).toString();
    }
    return code;
  };

  const createNewRoom = useCallback(() => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setGameMode('ONLINE');
    setPlayers([]);
    setGameState(GameState.ENTER_NAME);
  }, []);

  const startOfflineGame = () => {
      setGameMode('OFFLINE');
      setIsHost(true);
      setRoomCode('');
      setPlayers([]);
      let name = 'Player 1';
      let avatar = AVATARS[0];
      try {
          const savedPlayer = localStorage.getItem('alias_player');
          if (savedPlayer) {
              const p = JSON.parse(savedPlayer);
              if (p.name) name = p.name;
              if (p.avatar) avatar = p.avatar;
          }
      } catch (e) {}
      setPlayers([{ id: 'local-host', name, avatar, isHost: true, stats: { explained: 0 } }]);
      setMyPlayerId('local-host');
      setIsConnected(true);
      setGameState(GameState.LOBBY);
  };

  const broadcastState = useCallback(() => {
    if (!isHost || gameMode === 'OFFLINE') return;
    const fullState = stateRef.current;
    connectionsRef.current.forEach(conn => {
      if (conn.open) {
        conn.send({
          type: 'SYNC_STATE',
          payload: {
              gameState: fullState.gameState,
              settings: fullState.settings,
              players: fullState.players,
              teams: fullState.teams,
              currentTeamIndex: fullState.currentTeamIndex,
              currentWord: fullState.currentWord,
              timeLeft: fullState.timeLeft,
              currentRoundStats: fullState.currentRoundStats,
              isPaused: fullState.isPaused,
              wordDeck: fullState.wordDeck
          }
        });
      }
    });
  }, [isHost, gameMode]); 

  useEffect(() => {
    if (isHost && gameState !== GameState.MENU && gameMode === 'ONLINE') {
        const timer = setTimeout(() => {
            broadcastState();
        }, 50);
        return () => clearTimeout(timer);
    }
  }, [isHost, gameState, settings, players, teams, currentTeamIndex, currentWord, currentRoundStats, isPaused, broadcastState, gameMode, wordDeck]);

  const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const nextWordLogic = useCallback(() => {
      const { settings: s, customWords: cWords } = stateRef.current;
      let currentDeck = [...stateRef.current.wordDeck];
      if (currentDeck.length === 0) {
          let pool: string[] = [];
          s.categories.forEach(cat => {
            if (cat === Category.CUSTOM) pool = [...pool, ...cWords];
            else {
                const catWords = MOCK_WORDS[s.language][cat];
                if (catWords) pool = [...pool, ...catWords];
            }
          });
          if (pool.length === 0) pool = [...MOCK_WORDS[s.language][Category.GENERAL]];
          currentDeck = shuffleArray(Array.from(new Set(pool)));
      }
      const word = currentDeck.pop();
      setWordDeck(currentDeck);
      setCurrentWord(word || "Error");
  }, []);

  const nextWord = useCallback(() => nextWordLogic(), [nextWordLogic]);

  const initializeWordDeck = useCallback(() => {
    const { settings: s, customWords: cWords } = stateRef.current;
    let pool: string[] = [];
    s.categories.forEach(cat => {
      if (cat === Category.CUSTOM) pool = [...pool, ...cWords];
      else {
          const catWords = MOCK_WORDS[s.language][cat];
          if (catWords) pool = [...pool, ...catWords];
      }
    });
    const uniquePool = Array.from(new Set(pool));
    if (uniquePool.length === 0) {
         MOCK_WORDS[s.language][Category.GENERAL].forEach(w => uniquePool.push(w));
    }
    setWordDeck(shuffleArray(uniquePool));
  }, []);

  const performCorrect = useCallback(() => {
    playSound('correct');
    const { currentRoundStats: stats, currentWord: word } = stateRef.current;
    if (stats.explainerId) {
        setTeams(prevTeams => prevTeams.map(team => ({
            ...team,
            players: team.players.map(p => {
                if (p.id === stats.explainerId) {
                    return { ...p, stats: { explained: (p.stats?.explained || 0) + 1 }};
                }
                return p;
            })
        })));
    }
    setCurrentRoundStats(prev => ({
      ...prev,
      correct: prev.correct + 1,
      words: [...prev.words, { word: word, result: 'correct' }]
    }));
    nextWordLogic();
  }, [playSound, nextWordLogic]);

  const performSkip = useCallback(() => {
    playSound('skip');
    const { currentWord: word } = stateRef.current;
    setCurrentRoundStats(prev => ({
      ...prev,
      skipped: prev.skipped + 1,
      words: [...prev.words, { word: word, result: 'skipped' }]
    }));
    nextWordLogic();
  }, [playSound, nextWordLogic]);

  const startRoundLogic = useCallback(() => {
    const { teams: t, currentTeamIndex: idx } = stateRef.current;
    const activeTeam = t[idx];
    let explainer: Player;
    let scoringTeam = activeTeam;
    const isOneVsOne = t.every(tm => tm.players.length === 1);
    if (isOneVsOne) {
        explainer = activeTeam.players[0];
        const guessingTeamIndex = (idx + 1) % t.length;
        scoringTeam = t[guessingTeamIndex];
    } else {
        explainer = activeTeam.players[activeTeam.nextPlayerIndex];
    }
    setCurrentRoundStats({
      correct: 0, skipped: 0, words: [], teamId: scoringTeam.id,
      explainerName: explainer.name, explainerId: explainer.id
    });
    setGameState(GameState.COUNTDOWN);
  }, []);

  const performStartPlaying = useCallback(() => {
    playSound('start');
    setIsPaused(false);
    setGameState(GameState.PLAYING);
    setTimeLeft(stateRef.current.settings.roundTime);
    nextWordLogic();
  }, [playSound, nextWordLogic]);

  const nextRoundLogic = useCallback(() => {
    const { teams: t, currentTeamIndex: idx } = stateRef.current;
    const nextTeamIndex = (idx + 1) % t.length;
    setCurrentTeamIndex(nextTeamIndex);
    setGameState(GameState.PRE_ROUND);
  }, []);

  const performResetGame = useCallback(() => {
    setTeams(t => t.map(team => ({
      ...team, score: 0, nextPlayerIndex: 0,
      players: team.players.map(p => ({...p, stats: { explained: 0 }}))
    })));
    setCurrentTeamIndex(0);
    initializeWordDeck();
    setGameState(GameState.TEAMS);
  }, [initializeWordDeck]);

  const performRematch = useCallback(() => {
      setTeams(t => t.map(team => ({
          ...team, score: 0, nextPlayerIndex: 0,
          players: team.players.map(p => ({...p, stats: { explained: 0 }}))
      })));
      setCurrentTeamIndex(0);
      initializeWordDeck();
      setGameState(GameState.PRE_ROUND);
  }, [initializeWordDeck]);

  const performGenerateTeams = useCallback(() => {
    const { settings: s, players: ps } = stateRef.current;
    const teamNames = TRANSLATIONS[s.language].teamNames;
    const newTeams: Team[] = Array.from({ length: s.teamCount }, (_, i) => {
      const colorData = TEAM_COLORS[i % TEAM_COLORS.length];
      return {
        id: `team-${i}`,
        name: teamNames[i % teamNames.length],
        score: 0,
        color: colorData.class,
        colorHex: colorData.hex,
        players: [],
        nextPlayerIndex: 0
      };
    });
    const shuffledPlayerIds = shuffleArray(ps.map(p => p.id));
    shuffledPlayerIds.forEach((pid, index) => {
      const player = ps.find(p => p.id === pid);
      if (player) {
          const teamIndex = index % s.teamCount;
          newTeams[teamIndex].players.push(player);
      }
    });
    setTeams(newTeams);
  }, []);

  const performKickPlayer = useCallback((id: string) => {
      setPlayers(prev => prev.filter(p => p.id !== id));
      if (gameMode === 'OFFLINE') return;
      const connToKick = connectionsRef.current.find(c => c.playerId === id);
      if (connToKick && connToKick.open) {
          connToKick.send({ type: 'KICK_PLAYER', payload: { id } });
          setTimeout(() => connToKick.close(), 500);
      }
  }, [gameMode]);

  const handleGameAction = useCallback((payload: GameActionPayload) => {
     if (!payload || !payload.action) return;
     switch(payload.action) {
         case 'CORRECT': performCorrect(); break;
         case 'SKIP': performSkip(); break;
         case 'START_ROUND': startRoundLogic(); break;
         case 'START_PLAYING': performStartPlaying(); break;
         case 'NEXT_ROUND': nextRoundLogic(); break;
         case 'RESET_GAME': performResetGame(); break;
         case 'REMATCH': performRematch(); break;
         case 'GENERATE_TEAMS': performGenerateTeams(); break;
         case 'PAUSE_GAME': setIsPaused(prev => !prev); break;
         case 'KICK_PLAYER': 
            if (payload.data && payload.data.id) performKickPlayer(payload.data.id); 
            break;
     }
  }, [performCorrect, performSkip, startRoundLogic, performStartPlaying, nextRoundLogic, performResetGame, performRematch, performGenerateTeams, performKickPlayer]);

  const sendActionToHost = (payload: GameActionPayload) => {
     if (hostConnectionRef.current && hostConnectionRef.current.open) {
         hostConnectionRef.current.send({ type: 'GAME_ACTION', payload });
     }
  };

  const generateTeams = () => {
      if (isHost) performGenerateTeams();
      else sendActionToHost({ action: 'GENERATE_TEAMS' });
  };

  const resetGame = () => {
     if (isHost) performResetGame();
     else sendActionToHost({ action: 'RESET_GAME' });
  };

  const rematch = () => {
      if (isHost) performRematch();
      else sendActionToHost({ action: 'REMATCH' });
  };

  const handleAddPlayer = (id: string, name: string, avatar: string, isHostPlayer: boolean) => {
    const newPlayer: Player = { id, name, avatar, isHost: isHostPlayer, stats: { explained: 0 } };
    setPlayers(prev => {
        if (prev.some(p => p.id === id)) return prev;
        return [...prev, newPlayer];
    });
  };

  const handleJoin = (id: string, name: string, avatar: string) => {
      localStorage.setItem('alias_player', JSON.stringify({ name, avatar }));
      if (gameMode === 'OFFLINE') {
          handleAddPlayer(id, name, avatar, false);
      } else {
          setMyPlayerId(id);
          if (isHost) handleAddPlayer(id, name, avatar, true);
          else {
              const attemptJoin = () => {
                if (hostConnectionRef.current && hostConnectionRef.current.open) {
                  hostConnectionRef.current.send({ type: 'JOIN_REQUEST', payload: { id, name, avatar } });
                } else {
                  setTimeout(attemptJoin, 500);
                }
              };
              attemptJoin();
          }
      }
  };

  const handleCorrect = () => {
      if (isHost) performCorrect();
      else sendActionToHost({ action: 'CORRECT' });
  };

  const handleSkip = () => {
      if (isHost) performSkip();
      else sendActionToHost({ action: 'SKIP' });
  };

  const handleStartRound = () => {
      if (isHost) startRoundLogic();
      else sendActionToHost({ action: 'START_ROUND' });
  };

  const startGameplay = () => {
      if (isHost) performStartPlaying();
      else sendActionToHost({ action: 'START_PLAYING' });
  }

  const handleNextRound = () => {
      if (isHost) nextRoundLogic();
      else sendActionToHost({ action: 'NEXT_ROUND' });
  };

  const handleKickPlayer = (id: string) => {
      if (isHost) performKickPlayer(id);
      else sendActionToHost({ action: 'KICK_PLAYER', data: { id } });
  }

  const togglePause = () => {
      if (isHost) setIsPaused(prev => !prev);
      else sendActionToHost({ action: 'PAUSE_GAME' });
  }

  const isValidMessage = (data: any): data is NetworkMessage => {
    return data && typeof data === 'object' && typeof data.type === 'string' && data.payload !== undefined;
  };

  const validateJoinPayload = (payload: any) => {
      if (!payload || typeof payload !== 'object') return null;
      const safeId = String(payload.id).slice(0, 50);
      const safeName = String(payload.name).slice(0, 20).trim();
      const safeAvatar = typeof payload.avatar === 'string' && AVATARS.includes(payload.avatar) ? payload.avatar : AVATARS[0];
      if (!safeId || !safeName) return null;
      return { id: safeId, name: safeName, avatar: safeAvatar };
  };

  useEffect(() => {
    if (gameMode === 'OFFLINE' || !roomCode || gameState === GameState.MENU) {
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        setIsConnected(gameMode === 'OFFLINE');
        return;
    }
    if (peerRef.current) peerRef.current.destroy();
    
    const sanitizedRoomCode = roomCode.trim().slice(0, 5);
    const peerId = isHost ? `alias-master-${sanitizedRoomCode}` : `alias-player-${sanitizedRoomCode}-${Math.floor(Math.random() * 100000)}`;
    const peer = new Peer(peerId, { debug: 1 });
    
    if (isHost) setIsConnected(true);
    else setIsConnected(false);
    
    peer.on('open', (id) => {
      if (!isHost) {
        const connectToHost = () => {
          const conn = peer.connect(`alias-master-${sanitizedRoomCode}`, { reliable: true, serialization: 'json' }) as PeerConnection;
          const connectionTimeout = setTimeout(() => {
              if (!conn.open) {
                  conn.close();
                  if (!isHostReconnecting) showNotification(TRANSLATIONS[settings.language].roomNotFound, 'error');
              }
          }, 8000); 

          conn.on('open', () => {
            clearTimeout(connectionTimeout);
            hostConnectionRef.current = conn;
            setIsConnected(true);
            setIsHostReconnecting(false);
            setReconnectTimeLeft(60);
            if (reconnectIntervalRef.current) window.clearInterval(reconnectIntervalRef.current);
            
            // Re-send join request if we have a name entered
            const savedPlayer = localStorage.getItem('alias_player');
            if (savedPlayer && stateRef.current.myPlayerId) {
                const p = JSON.parse(savedPlayer);
                conn.send({ type: 'JOIN_REQUEST', payload: { id: stateRef.current.myPlayerId, name: p.name, avatar: p.avatar } });
            }
          });

          conn.on('data', (data: any) => {
             if (!isValidMessage(data)) return;
             const msg = data as NetworkMessage;
             if (msg.type === 'SYNC_STATE') {
               const state = msg.payload;
               if (!state) return;
               if (stateRef.current.gameState !== GameState.ENTER_NAME && stateRef.current.gameState !== GameState.JOIN_INPUT) {
                  if (state.gameState) setGameState(state.gameState);
               }
               if (state.settings) setSettings(state.settings);
               if (state.players) setPlayers(state.players);
               if (state.teams) setTeams(state.teams);
               if (state.currentTeamIndex !== undefined) setCurrentTeamIndex(state.currentTeamIndex);
               if (state.currentWord) setCurrentWord(state.currentWord);
               if (state.timeLeft !== undefined) setTimeLeft(state.timeLeft);
               if (state.currentRoundStats) setCurrentRoundStats(state.currentRoundStats);
               if (state.isPaused !== undefined) setIsPaused(state.isPaused);
               if (state.wordDeck) setWordDeck(state.wordDeck);
             } else if (msg.type === 'KICK_PLAYER') {
                 if (msg.payload && msg.payload.id === stateRef.current.myPlayerId) {
                     showNotification("Вас було видалено з гри.", 'error');
                     setRoomCode('');
                     setGameState(GameState.MENU);
                 }
             }
          });

          conn.on('close', () => {
            setIsConnected(false);
            if (gameState !== GameState.MENU) {
              setIsHostReconnecting(true);
              reconnectIntervalRef.current = window.setInterval(() => {
                setReconnectTimeLeft(prev => {
                  if (prev <= 1) {
                    window.clearInterval(reconnectIntervalRef.current!);
                    setGameState(GameState.MENU);
                    setIsHostReconnecting(false);
                    return 60;
                  }
                  return prev - 1;
                });
                connectToHost();
              }, 3000);
            }
          });
          conn.on('error', () => setIsConnected(false));
        };
        connectToHost();
      }
    });

    peer.on('connection', (c) => {
      if (isHost) {
        const conn = c as PeerConnection;
        connectionsRef.current.push(conn);
        conn.on('open', () => {
             const fullState = stateRef.current;
             conn.send({ type: 'SYNC_STATE', payload: { ...fullState } });
        });
        conn.on('data', (data: any) => {
          if (!isValidMessage(data)) return;
          const msg = data as NetworkMessage;
          if (msg.type === 'JOIN_REQUEST') {
             const validated = validateJoinPayload(msg.payload);
             if (validated) {
                 const { id, name, avatar } = validated;
                 setPlayers(prev => {
                   if (prev.some(p => p.id === id)) return prev;
                   return [...prev, { id, name, avatar, isHost: false, stats: { explained: 0 } }];
                 });
                 conn.playerId = id; 
                 setTimeout(() => broadcastState(), 100);
             }
          } else if (msg.type === 'GAME_ACTION' && msg.payload?.action) {
             handleGameAction(msg.payload as GameActionPayload);
          }
        });
        conn.on('close', () => {
           connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
           // We keep the player in the list for a while to allow reconnection
           setTimeout(() => {
              if (!connectionsRef.current.some(c => c.playerId === conn.playerId)) {
                 // Player really gone
                 // setPlayers(prev => prev.filter(p => p.id !== conn.playerId));
              }
           }, 5000);
        });
      }
    });

    peerRef.current = peer;
    return () => {
      if (peerRef.current) peerRef.current.destroy();
      if (reconnectIntervalRef.current) window.clearInterval(reconnectIntervalRef.current);
      connectionsRef.current = [];
      hostConnectionRef.current = null;
    };
  }, [roomCode, isHost, gameMode, handleGameAction, showNotification, settings.language, broadcastState]); 

  return (
    <GameContext.Provider value={{
      gameState, setGameState, gameMode, setGameMode, settings, setSettings,
      roomCode, setRoomCode, isHost, setIsHost, myPlayerId, setMyPlayerId,
      players, setPlayers, teams, setTeams, currentTeamIndex, setCurrentTeamIndex,
      currentTheme, playSound, wordDeck, setWordDeck, currentWord, nextWord,
      currentRoundStats, setCurrentRoundStats, timeLeft, setTimeLeft, isPaused, customWords, setCustomWords,
      isConnected, isHostReconnecting, reconnectTimeLeft, initializeWordDeck, generateTeams, resetGame, rematch, createNewRoom, startOfflineGame,
      handleCorrect, handleSkip, handleStartRound, startGameplay, handleNextRound, handleJoin, handleKickPlayer, togglePause,
      showNotification
    }}>
      {notification && <ToastNotification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};
