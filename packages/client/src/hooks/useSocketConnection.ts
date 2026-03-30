import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameSyncState,
  Player,
} from '@alias/shared';
import { getAuthToken, PLAYER_ID_KEY, ROOM_CODE_KEY } from '../services/api';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

// Prefer same-origin by default so Socket.IO works behind nginx gateway/NPM without CORS/host mismatch.
const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL && normalizeBaseUrl(import.meta.env.VITE_SERVER_URL)) ||
  (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:3001');

interface UseSocketConnectionOptions {
  onStateSync: (state: GameSyncState) => void;
  onPlayerJoined: (player: Player) => void;
  onPlayerLeft: (playerId: string) => void;
  onKicked: () => void;
  onError: (message: string) => void;
  onNotification: (message: string, type: 'info' | 'error' | 'success') => void;
  onRejoined?: (roomCode: string, playerId: string) => void;
}

export function useSocketConnection(options: UseSocketConnectionOptions) {
  const socketRef = useRef<AppSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const optionsRef = useRef(options);
  optionsRef.current = options;
  /** Синхронний ref для myPlayerId — потрібен для onStateSync, щоб одразу мати актуальний id після room:created */
  const myPlayerIdRef = useRef('');

  useEffect(() => {
    const token = getAuthToken();
    const socket: AppSocket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Auto-rejoin if we have stored session data
      const storedRoom = localStorage.getItem(ROOM_CODE_KEY);
      const storedPlayer = localStorage.getItem(PLAYER_ID_KEY);
      if (storedRoom && storedPlayer) {
        socket.emit('room:rejoin', { roomCode: storedRoom, playerId: storedPlayer });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room:rejoined', ({ roomCode: code, playerId }) => {
      myPlayerIdRef.current = playerId;
      setMyPlayerId(playerId);
      setRoomCode(code);
      optionsRef.current.onRejoined?.(code, playerId);
    });

    socket.on('game:state-sync', (state) => {
      optionsRef.current.onStateSync(state);
    });

    socket.on('room:player-joined', ({ player }) => {
      optionsRef.current.onPlayerJoined(player);
    });

    socket.on('room:player-left', ({ playerId }) => {
      optionsRef.current.onPlayerLeft(playerId);
    });

    socket.on('player:kicked', () => {
      optionsRef.current.onKicked();
    });

    socket.on('room:error', ({ message }) => {
      optionsRef.current.onError(message);
    });

    socket.on('game:notification', ({ message, type }) => {
      optionsRef.current.onNotification(message, type);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const connect = useCallback(() => {
    socketRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  const createRoom = useCallback((playerName: string, avatar: string, avatarId?: string | null) => {
    const socket = socketRef.current;
    if (!socket) return;

    // Clear any previous session data BEFORE connecting so the connect handler
    // does not auto-send room:rejoin and interfere with the new room creation.
    localStorage.removeItem(ROOM_CODE_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);

    const doEmit = () => {
      socket.once('room:created', ({ roomCode: code, playerId }) => {
        myPlayerIdRef.current = playerId;
        setMyPlayerId(playerId);
        setRoomCode(code);
        localStorage.setItem(ROOM_CODE_KEY, code);
        localStorage.setItem(PLAYER_ID_KEY, playerId);
      });
      socket.emit('room:create', { playerName, avatar, ...(avatarId != null ? { avatarId } : {}) });
    };

    if (socket.connected) {
      doEmit();
    } else {
      socket.connect();
      socket.once('connect', doEmit);
    }
  }, []);

  const joinRoom = useCallback((code: string, playerName: string, avatar: string, avatarId?: string | null) => {
    const socket = socketRef.current;
    if (!socket) return;

    // Clear previous session data so auto-rejoin does not fire for a different room.
    localStorage.removeItem(ROOM_CODE_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);

    const doEmit = () => {
      socket.once('room:joined', ({ roomCode: joinedCode, playerId }) => {
        myPlayerIdRef.current = playerId;
        setMyPlayerId(playerId);
        setRoomCode(joinedCode);
        localStorage.setItem(ROOM_CODE_KEY, joinedCode);
        localStorage.setItem(PLAYER_ID_KEY, playerId);
      });
      socket.emit('room:join', { roomCode: code, playerName, avatar, ...(avatarId != null ? { avatarId } : {}) });
    };

    if (socket.connected) {
      doEmit();
    } else {
      socket.connect();
      socket.once('connect', doEmit);
    }
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
    setRoomCode('');
    setMyPlayerId('');
    myPlayerIdRef.current = '';
    localStorage.removeItem(ROOM_CODE_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);
  }, []);

  const sendGameAction = useCallback((payload: Parameters<ClientToServerEvents['game:action']>[0]) => {
    socketRef.current?.emit('game:action', payload);
  }, []);

  return {
    isConnected,
    myPlayerId,
    myPlayerIdRef,
    roomCode,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    sendGameAction,
  };
}
