import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameSyncState,
  Player,
  RoomErrorPayload,
} from '@alias/shared';
import { getAuthToken, PLAYER_ID_KEY, ROOM_CODE_KEY } from '../services/api';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** JWT is read once in `io()` options at mount — after Google login it must be refreshed before handshake. */
function applyHandshakeAuth(socket: AppSocket): void {
  const token = getAuthToken();
  socket.auth = token ? { token } : {};
}

/**
 * Next `connect()` must send fresh auth. If already connected, disconnect first (handshake is fixed per connection).
 */
function prepareSocketForRoomHandshake(socket: AppSocket): void {
  applyHandshakeAuth(socket);
  if (socket.connected) {
    socket.disconnect();
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

// Prefer same-origin by default so Socket.IO works behind nginx gateway/NPM without CORS/host mismatch.
const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL && normalizeBaseUrl(import.meta.env.VITE_SERVER_URL)) ||
  (typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:3001');

interface UseSocketConnectionOptions {
  onStateSync: (state: GameSyncState) => void;
  onPlayerJoined: (player: Player) => void;
  onPlayerLeft: (playerId: string) => void;
  onKicked: () => void;
  onError: (error: RoomErrorPayload) => void;
  onNotification: (message: string, type: 'info' | 'error' | 'success') => void;
  onRejoined?: (roomCode: string, playerId: string) => void;
  onImposterSecret?: (payload: Parameters<ServerToClientEvents['imposter:secret']>[0]) => void;
}

export function useSocketConnection(options: UseSocketConnectionOptions) {
  const socketRef = useRef<AppSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  /** True between emitting room:rejoin (after connect) and room:rejoined / room:error. */
  const [isReconnecting, setIsReconnecting] = useState(false);
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
      const storedRoom = localStorage.getItem(ROOM_CODE_KEY);
      const storedPlayer = localStorage.getItem(PLAYER_ID_KEY);
      if (storedRoom && storedPlayer) {
        setIsReconnecting(true);
        socket.emit('room:rejoin', { roomCode: storedRoom, playerId: storedPlayer });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setIsReconnecting(false);
    });

    socket.on('room:rejoined', ({ roomCode: code, playerId }) => {
      setIsReconnecting(false);
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

    socket.on('player:kicked', ({ playerId }) => {
      if (playerId === myPlayerIdRef.current) {
        optionsRef.current.onKicked();
      }
    });

    socket.on('room:error', (payload) => {
      setIsReconnecting(false);
      optionsRef.current.onError(payload);
    });

    socket.on('game:notification', ({ message, type }) => {
      optionsRef.current.onNotification(message, type);
    });

    socket.on('imposter:secret', (payload) => {
      optionsRef.current.onImposterSecret?.(payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const connect = useCallback(() => {
    const s = socketRef.current;
    if (!s) return;
    applyHandshakeAuth(s);
    s.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  const createRoom = useCallback((playerName: string, avatar: string, avatarId?: string | null) => {
    const socket = socketRef.current;
    if (!socket) return;

    setIsReconnecting(false);
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

    prepareSocketForRoomHandshake(socket);
    socket.once('connect', doEmit);
    socket.connect();
  }, []);

  const joinRoom = useCallback(
    (code: string, playerName: string, avatar: string, avatarId?: string | null) => {
      const socket = socketRef.current;
      if (!socket) return;

      setIsReconnecting(false);
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
        socket.emit('room:join', {
          roomCode: code,
          playerName,
          avatar,
          ...(avatarId != null ? { avatarId } : {}),
        });
      };

      prepareSocketForRoomHandshake(socket);
      socket.once('connect', doEmit);
      socket.connect();
    },
    []
  );

  const checkRoomExists = useCallback((code: string): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      const emitCheck = () => {
        socket.emit('room:exists', { roomCode: code }, (res) => {
          resolve(Boolean(res?.exists));
          // This check is used before joining a room; keep the socket clean/idle.
          if (socket.connected) socket.disconnect();
        });
      };

      // If already connected, just emit. Otherwise connect for a single roundtrip.
      if (socket.connected) {
        emitCheck();
        return;
      }

      prepareSocketForRoomHandshake(socket);
      socket.once('connect', emitCheck);
      socket.connect();
    });
  }, []);

  const leaveRoom = useCallback(() => {
    setIsReconnecting(false);
    socketRef.current?.emit('room:leave');
    setRoomCode('');
    setMyPlayerId('');
    myPlayerIdRef.current = '';
    localStorage.removeItem(ROOM_CODE_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);
  }, []);

  const sendGameAction = useCallback(
    (payload: Parameters<ClientToServerEvents['game:action']>[0]) => {
      socketRef.current?.emit('game:action', payload);
    },
    []
  );

  return useMemo(
    () => ({
      isConnected,
      isReconnecting,
      myPlayerId,
      myPlayerIdRef,
      roomCode,
      connect,
      disconnect,
      createRoom,
      joinRoom,
      checkRoomExists,
      leaveRoom,
      sendGameAction,
    }),
    [
      isConnected,
      isReconnecting,
      myPlayerId,
      roomCode,
      connect,
      disconnect,
      createRoom,
      joinRoom,
      checkRoomExists,
      leaveRoom,
      sendGameAction,
    ]
  );
}
