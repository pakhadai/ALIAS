import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@alias/shared';
import type { RoomManager } from '../services/RoomManager';
import type { GameEngine } from '../services/GameEngine';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerSocketHandlers(
  io: IO,
  socket: AppSocket,
  roomManager: RoomManager,
  gameEngine: GameEngine,
): void {
  socket.on('room:create', ({ playerName, avatar }) => {
    const room = roomManager.createRoom(socket.id);
    const player = roomManager.addPlayer(room.code, socket.id, playerName, avatar);
    if (!player) {
      socket.emit('room:error', { message: 'Failed to create room' });
      return;
    }

    // Mark host
    player.isHost = true;
    socket.join(room.code);
    socket.data.playerId = player.id;
    socket.data.playerName = playerName;
    socket.data.roomCode = room.code;

    socket.emit('room:created', { roomCode: room.code, playerId: player.id });
    broadcastState(io, room.code, roomManager);
  });

  socket.on('room:join', ({ roomCode, playerName, avatar }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) {
      socket.emit('room:error', { message: `Room ${roomCode} not found` });
      return;
    }

    const player = roomManager.addPlayer(roomCode, socket.id, playerName, avatar);
    if (!player) {
      socket.emit('room:error', { message: 'Room is full' });
      return;
    }

    socket.join(roomCode);
    socket.data.playerId = player.id;
    socket.data.playerName = playerName;
    socket.data.roomCode = roomCode;

    socket.emit('room:joined', { roomCode, playerId: player.id });
    io.to(roomCode).emit('room:player-joined', { player });
    broadcastState(io, roomCode, roomManager);
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

  socket.on('game:action', (payload) => {
    const { roomCode } = socket.data;
    if (!roomCode) return;

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Only host can execute game actions (or we relay non-host to server which acts as host)
    gameEngine.handleAction(room, payload);

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
  io.to(roomCode).emit('game:state-sync', roomManager.getSyncState(room));
}
