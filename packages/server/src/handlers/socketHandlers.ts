import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@alias/shared';
import type { RoomManager } from '../services/RoomManager';
import type { GameEngine } from '../services/GameEngine';
import { roomCreateSchema, roomJoinSchema, validatePayload, validateGameAction } from '../validation/schemas';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerSocketHandlers(
  io: IO,
  socket: AppSocket,
  roomManager: RoomManager,
  gameEngine: GameEngine,
): void {
  socket.on('room:create', (rawData) => {
    const data = validatePayload(roomCreateSchema, rawData);
    if (!data) {
      socket.emit('room:error', { message: 'Invalid data' });
      return;
    }

    const room = roomManager.createRoom(socket.id);
    const player = roomManager.addPlayer(room.code, socket.id, data.playerName, data.avatar, data.avatarId);
    if (!player) {
      socket.emit('room:error', { message: 'Failed to create room' });
      return;
    }

    player.isHost = true;
    room.hostUserId = socket.data.userId as string | undefined;
    socket.join(room.code);
    socket.data.playerId = player.id;
    socket.data.playerName = data.playerName;
    socket.data.roomCode = room.code;

    socket.emit('room:created', { roomCode: room.code, playerId: player.id });
    broadcastState(io, room.code, roomManager);
  });

  socket.on('room:join', async (rawData) => {
    const data = validatePayload(roomJoinSchema, rawData);
    if (!data) {
      socket.emit('room:error', { message: 'Invalid data' });
      return;
    }

    // Try in-memory first; fall back to Redis (handles server restarts)
    let room = roomManager.getRoom(data.roomCode);
    if (!room) {
      room = await roomManager.restoreRoomFromRedis(data.roomCode) ?? undefined;
    }
    if (!room) {
      socket.emit('room:error', { message: `Room ${data.roomCode} not found` });
      return;
    }

    const player = roomManager.addPlayer(data.roomCode, socket.id, data.playerName, data.avatar, data.avatarId);
    if (!player) {
      socket.emit('room:error', { message: 'Room is full' });
      return;
    }

    socket.join(data.roomCode);
    socket.data.playerId = player.id;
    socket.data.playerName = data.playerName;
    socket.data.roomCode = data.roomCode;

    socket.emit('room:joined', { roomCode: data.roomCode, playerId: player.id });
    io.to(data.roomCode).emit('room:player-joined', { player });
    broadcastState(io, data.roomCode, roomManager);
  });

  socket.on('room:leave', () => {
    const { roomCode } = socket.data;
    if (!roomCode) return;

    const playerId = roomManager.removePlayer(roomCode, socket.id);
    if (playerId) {
      socket.leave(roomCode);
      io.to(roomCode).emit('room:player-left', { playerId });
      broadcastState(io, roomCode, roomManager);
    }
  });

  socket.on('game:action', async (rawPayload) => {
    const { roomCode } = socket.data;
    if (!roomCode) return;

    const payload = validateGameAction(rawPayload);
    if (!payload) {
      socket.emit('room:error', { message: 'Invalid action' });
      return;
    }

    // Reject offline-only actions
    if (payload.action === 'ADD_OFFLINE_PLAYER' || payload.action === 'REMOVE_OFFLINE_PLAYER') {
      return;
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Protect host-only actions: only allow if this socket is the room host
    const hostOnlyActions = new Set([
      'START_GAME', 'START_DUEL', 'START_ROUND', 'START_PLAYING',
      'NEXT_ROUND', 'RESET_GAME', 'REMATCH', 'GENERATE_TEAMS',
      'PAUSE_GAME', 'CONFIRM_ROUND', 'UPDATE_SETTINGS', 'KICK_PLAYER',
      'CORRECT', 'SKIP', 'TIME_UP'
    ]);
    if (hostOnlyActions.has(payload.action) && socket.id !== room.hostSocketId) {
      socket.emit('room:error', { message: 'Only the host can perform this action' });
      return;
    }

    await gameEngine.handleAction(room, payload);

    // Handle kick: disconnect the kicked player's socket
    if (payload.action === 'KICK_PLAYER' && payload.data) {
      const kickedSocketId = roomManager.getPlayerSocketId(room, payload.data);
      if (kickedSocketId) {
        const kickedSocket = io.sockets.sockets.get(kickedSocketId);
        if (kickedSocket) {
          kickedSocket.emit('player:kicked');
          kickedSocket.leave(roomCode);
          room.socketToPlayer.delete(kickedSocketId);
        }
      }
    }

    broadcastState(io, roomCode, roomManager);
  });
}

function broadcastState(io: IO, roomCode: string, roomManager: RoomManager): void {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;
  const state = roomManager.getSyncState(room);
  io.to(roomCode).emit('game:state-sync', state);
  roomManager.persistRoom(room);
}
