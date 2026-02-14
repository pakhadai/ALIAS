import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameSyncState,
  Player,
} from '@alias/shared';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface UseSocketConnectionOptions {
  onStateSync: (state: GameSyncState) => void;
  onPlayerJoined: (player: Player) => void;
  onPlayerLeft: (playerId: string) => void;
  onKicked: () => void;
  onError: (message: string) => void;
  onNotification: (message: string, type: 'info' | 'error' | 'success') => void;
}

export function useSocketConnection(options: UseSocketConnectionOptions) {
  const socketRef = useRef<AppSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const socket: AppSocket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
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

  const createRoom = useCallback((playerName: string, avatar: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) socket?.connect();

    socket?.once('room:created', ({ roomCode: code, playerId }) => {
      setMyPlayerId(playerId);
      setRoomCode(code);
    });

    socket?.emit('room:create', { playerName, avatar });
  }, []);

  const joinRoom = useCallback((code: string, playerName: string, avatar: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) socket?.connect();

    socket?.once('room:joined', ({ roomCode: joinedCode, playerId }) => {
      setMyPlayerId(playerId);
      setRoomCode(joinedCode);
    });

    socket?.emit('room:join', { roomCode: code, playerName, avatar });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
    setRoomCode('');
    setMyPlayerId('');
  }, []);

  const sendGameAction = useCallback((payload: Parameters<ClientToServerEvents['game:action']>[0]) => {
    socketRef.current?.emit('game:action', payload);
  }, []);

  return {
    isConnected,
    myPlayerId,
    roomCode,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    sendGameAction,
  };
}
