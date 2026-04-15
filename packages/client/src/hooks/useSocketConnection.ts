import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameSyncState,
  Player,
  RoomErrorPayload,
} from '@alias/shared';
import {
  clearAuthToken,
  getAuthToken,
  getApiBaseUrl,
  PLAYER_ID_KEY,
  ROOM_CODE_KEY,
} from '../services/api';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const ROOM_CODE_RE = /^\d{5}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

// Prefer same-origin by default so Socket.IO works behind nginx gateway/NPM without CORS/host mismatch.
const SERVER_URL = getApiBaseUrl();

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
  /**
   * Some socket connects are "utility" (e.g. room:exists) and must NOT trigger localStorage-based
   * `room:rejoin`, otherwise deep links can be hijacked by an old persisted room.
   */
  const suppressStoredRejoinRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  /** Синхронний ref для myPlayerId — потрібен для onStateSync, щоб одразу мати актуальний id після room:created */
  const myPlayerIdRef = useRef('');
  /** Скасовує попередній `connect`-слухач для room:create / room:join (мобільні: disconnect не завжди синхронний). */
  const pendingRoomConnectHandlerRef = useRef<(() => void) | null>(null);
  /** Pending room op rejecter so connect_error can fail fast (handshake can be rejected). */
  const pendingRoomOpRejectRef = useRef<((err: Error) => void) | null>(null);

  const scheduleEmitAfterHandshakeConnect = useCallback(
    (emitWhenConnected: () => void, onConnectError?: (err: Error) => void) => {
      const socket = socketRef.current;
      if (!socket) return;
      if (pendingRoomConnectHandlerRef.current) {
        socket.off('connect', pendingRoomConnectHandlerRef.current);
        pendingRoomConnectHandlerRef.current = null;
      }
      pendingRoomOpRejectRef.current = onConnectError ?? null;
      prepareSocketForRoomHandshake(socket);
      const onConnected = () => {
        socket.off('connect', onConnected);
        pendingRoomConnectHandlerRef.current = null;
        pendingRoomOpRejectRef.current = null;
        emitWhenConnected();
      };
      pendingRoomConnectHandlerRef.current = onConnected;
      socket.on('connect', onConnected);
      window.setTimeout(() => {
        socket.connect();
      }, 0);
    },
    []
  );

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
      if (suppressStoredRejoinRef.current) return;
      const storedRoom = localStorage.getItem(ROOM_CODE_KEY);
      const storedPlayer = localStorage.getItem(PLAYER_ID_KEY);
      if (storedRoom && storedPlayer) {
        // Telegram deep-link guard: if `start_param` points to another room, don't auto-rejoin the old one.
        const tgStartParam = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.start_param as
          | string
          | undefined;
        if (typeof tgStartParam === 'string' && tgStartParam.startsWith('lobby_')) {
          const deepRoom = tgStartParam.slice('lobby_'.length).trim();
          if (ROOM_CODE_RE.test(deepRoom) && deepRoom !== storedRoom) {
            localStorage.removeItem(ROOM_CODE_KEY);
            localStorage.removeItem(PLAYER_ID_KEY);
            return;
          }
        }

        // Guard against legacy/corrupted localStorage values (avoids noisy "INVALID_PAYLOAD" errors).
        if (!ROOM_CODE_RE.test(storedRoom) || !UUID_RE.test(storedPlayer)) {
          localStorage.removeItem(ROOM_CODE_KEY);
          localStorage.removeItem(PLAYER_ID_KEY);
          return;
        }
        setIsReconnecting(true);
        socket.emit('room:rejoin', { roomCode: storedRoom, playerId: storedPlayer });
      }
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      setIsReconnecting(false);
      // If server rejected the handshake due to an invalid/expired token, clear it and re-hydrate auth.
      // Otherwise the app can get stuck in a loop of failing connections.
      const msg =
        (err instanceof Error && err.message) || 'Socket connection failed (handshake rejected)';
      if (/invalid|expired token/i.test(msg) || /jwt/i.test(msg)) {
        clearAuthToken();
      }
      // If a room operation is waiting for handshake connect, fail it immediately.
      if (pendingRoomOpRejectRef.current) {
        try {
          pendingRoomOpRejectRef.current(err instanceof Error ? err : new Error(String(err)));
        } finally {
          pendingRoomOpRejectRef.current = null;
        }
      }
      optionsRef.current.onError({ code: 'SOCKET_CONNECT_ERROR', message: msg });
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
        // Ensure we don't get stuck in a "kick -> refresh -> auto rejoin" loop.
        try {
          localStorage.removeItem(ROOM_CODE_KEY);
          localStorage.removeItem(PLAYER_ID_KEY);
        } catch {
          /* ignore */
        }
        setIsReconnecting(false);
        setRoomCode('');
        setMyPlayerId('');
        myPlayerIdRef.current = '';
        socket.disconnect();
        optionsRef.current.onKicked();
      }
    });

    socket.on('room:error', (payload) => {
      setIsReconnecting(false);
      // If the room is unavailable, clear stored join keys so we don't keep "zombie reconnecting".
      if (payload.code === 'ROOM_NOT_FOUND' || payload.code === 'PLAYER_NOT_IN_ROOM') {
        try {
          localStorage.removeItem(ROOM_CODE_KEY);
          localStorage.removeItem(PLAYER_ID_KEY);
        } catch {
          /* ignore */
        }
        setRoomCode('');
        setMyPlayerId('');
        myPlayerIdRef.current = '';
      }
      optionsRef.current.onError(payload);
    });

    socket.on('game:notification', ({ message, type }) => {
      optionsRef.current.onNotification(message, type);
    });

    socket.on('imposter:secret', (payload) => {
      optionsRef.current.onImposterSecret?.(payload);
    });

    return () => {
      if (pendingRoomConnectHandlerRef.current) {
        socket.off('connect', pendingRoomConnectHandlerRef.current);
        pendingRoomConnectHandlerRef.current = null;
      }
      pendingRoomOpRejectRef.current = null;
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

  const createRoom = useCallback(
    (playerName: string, avatar: string, avatarId?: string | null) => {
      return new Promise<{ roomCode: string; playerId: string }>((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket) {
          reject(new Error('NO_SOCKET'));
          return;
        }

        setIsReconnecting(false);
        // If we're already in a room (e.g. background rejoin), explicitly leave it first
        // so server-side "already in room" guard never blocks room:create.
        if (roomCode) {
          socket.emit('room:leave');
          socket.disconnect();
          setRoomCode('');
          setMyPlayerId('');
          myPlayerIdRef.current = '';
        }
        localStorage.removeItem(ROOM_CODE_KEY);
        localStorage.removeItem(PLAYER_ID_KEY);

        let detached = false;
        const tid: { current?: number } = {};
        const onCreatedRef: {
          current?: (d: { roomCode: string; playerId: string }) => void;
        } = {};
        const onErrRef: { current?: (p: RoomErrorPayload) => void } = {};

        const detach = () => {
          if (detached) return;
          detached = true;
          if (tid.current !== undefined) clearTimeout(tid.current);
          if (onCreatedRef.current) socket.off('room:created', onCreatedRef.current);
          if (onErrRef.current) socket.off('room:error', onErrRef.current);
        };

        const onCreated = ({
          roomCode: code,
          playerId,
        }: {
          roomCode: string;
          playerId: string;
        }) => {
          detach();
          myPlayerIdRef.current = playerId;
          setMyPlayerId(playerId);
          setRoomCode(code);
          localStorage.setItem(ROOM_CODE_KEY, code);
          localStorage.setItem(PLAYER_ID_KEY, playerId);
          resolve({ roomCode: code, playerId });
        };

        const onErr = (payload: RoomErrorPayload) => {
          detach();
          reject(Object.assign(new Error(payload.message), { code: payload.code }));
        };
        onCreatedRef.current = onCreated;
        onErrRef.current = onErr;

        tid.current = window.setTimeout(() => {
          detach();
          reject(new Error('ROOM_OPERATION_TIMEOUT'));
        }, 45_000);

        const doEmit = () => {
          socket.removeAllListeners('room:created');
          socket.on('room:created', onCreated);
          socket.on('room:error', onErr);
          const payload = {
            playerName,
            avatar,
            ...(avatarId != null && String(avatarId).trim() !== ''
              ? { avatarId: String(avatarId).slice(0, 3) }
              : {}),
          };
          socket.emit('room:create', payload);
        };

        scheduleEmitAfterHandshakeConnect(doEmit, (err) => {
          detach();
          reject(err);
        });
      });
    },
    [roomCode, scheduleEmitAfterHandshakeConnect]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string, avatar: string, avatarId?: string | null) => {
      return new Promise<{ roomCode: string; playerId: string }>((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket) {
          reject(new Error('NO_SOCKET'));
          return;
        }

        setIsReconnecting(false);
        // Same as createRoom: ensure we're not bound to a previous room.
        if (roomCode) {
          socket.emit('room:leave');
          socket.disconnect();
          setRoomCode('');
          setMyPlayerId('');
          myPlayerIdRef.current = '';
        }
        localStorage.removeItem(ROOM_CODE_KEY);
        localStorage.removeItem(PLAYER_ID_KEY);

        let detached = false;
        const tid: { current?: number } = {};
        const onJoinedRef: { current?: (d: { roomCode: string; playerId: string }) => void } = {};
        const onErrRef: { current?: (p: RoomErrorPayload) => void } = {};

        const detach = () => {
          if (detached) return;
          detached = true;
          if (tid.current !== undefined) clearTimeout(tid.current);
          if (onJoinedRef.current) socket.off('room:joined', onJoinedRef.current);
          if (onErrRef.current) socket.off('room:error', onErrRef.current);
        };

        const onJoined = ({
          roomCode: joinedCode,
          playerId,
        }: {
          roomCode: string;
          playerId: string;
        }) => {
          detach();
          myPlayerIdRef.current = playerId;
          setMyPlayerId(playerId);
          setRoomCode(joinedCode);
          localStorage.setItem(ROOM_CODE_KEY, joinedCode);
          localStorage.setItem(PLAYER_ID_KEY, playerId);
          resolve({ roomCode: joinedCode, playerId });
        };

        const onErr = (payload: RoomErrorPayload) => {
          detach();
          reject(Object.assign(new Error(payload.message), { code: payload.code }));
        };
        onJoinedRef.current = onJoined;
        onErrRef.current = onErr;

        tid.current = window.setTimeout(() => {
          detach();
          reject(new Error('ROOM_OPERATION_TIMEOUT'));
        }, 45_000);

        const doEmit = () => {
          socket.removeAllListeners('room:joined');
          socket.on('room:joined', onJoined);
          socket.on('room:error', onErr);
          socket.emit('room:join', {
            roomCode: code,
            playerName,
            avatar,
            ...(avatarId != null && String(avatarId).trim() !== ''
              ? { avatarId: String(avatarId).slice(0, 3) }
              : {}),
          });
        };

        scheduleEmitAfterHandshakeConnect(doEmit, (err) => {
          detach();
          reject(err);
        });
      });
    },
    [roomCode, scheduleEmitAfterHandshakeConnect]
  );

  const checkRoomExists = useCallback((code: string): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      const emitCheck = () => {
        socket.emit('room:exists', { roomCode: code }, (res) => {
          resolve(Boolean(res?.exists));
          // This check is used before joining a room; keep the socket clean/idle.
          suppressStoredRejoinRef.current = false;
          if (socket.connected) socket.disconnect();
        });
      };

      // If already connected, just emit. Otherwise connect for a single roundtrip.
      if (socket.connected) {
        emitCheck();
        return;
      }

      suppressStoredRejoinRef.current = true;
      prepareSocketForRoomHandshake(socket);
      socket.once('connect', emitCheck);
      socket.connect();
    });
  }, []);

  const leaveRoom = useCallback(() => {
    setIsReconnecting(false);
    socketRef.current?.emit('room:leave');
    // Explicitly leaving a room should fully tear down the connection to avoid stale listeners/state.
    socketRef.current?.disconnect();
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
