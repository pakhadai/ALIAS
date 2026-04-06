import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  GameActionPayload,
} from '@alias/shared';
import type { RoomManager, Room } from '../services/RoomManager';
import type { GameEngine } from '../services/GameEngine';
import { cancelGraceRemoval } from '../services/disconnectGrace';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function broadcastRoomState(io: IO, roomCode: string, roomManager: RoomManager): void {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;
  const state = roomManager.getSyncState(room);
  io.to(roomCode).emit('game:state-sync', state);

  // IMPOSTER: send per-player secret (word/null) individually.
  if (room.settings.mode.gameMode === 'IMPOSTER' && room.imposterPhase) {
    for (const [socketId, playerId] of room.socketToPlayer.entries()) {
      const isImposter = !!room.imposterPlayerId && playerId === room.imposterPlayerId;
      const word =
        room.imposterPhase === 'RESULTS'
          ? (room.imposterWord ?? null)
          : isImposter
            ? null
            : (room.imposterWord ?? null);
      io.to(socketId).emit('imposter:secret', { isImposter, word });
    }
  }

  roomManager.persistRoom(room);
}

export async function executeGameActionPipeline(
  io: IO,
  roomManager: RoomManager,
  gameEngine: GameEngine,
  room: Room,
  roomCode: string,
  payload: GameActionPayload,
  actorPlayerId: string | undefined
): Promise<void> {
  const kickTargetId = payload.action === 'KICK_PLAYER' ? payload.data : undefined;
  const kickedSocketIdEarly = kickTargetId
    ? roomManager.getPlayerSocketId(room, kickTargetId)
    : undefined;

  await gameEngine.handleAction(room, payload, actorPlayerId);

  if (payload.action === 'KICK_PLAYER' && kickTargetId) {
    cancelGraceRemoval(kickTargetId);
    roomManager.detachSocketsForPlayer(room, kickTargetId);
    io.to(roomCode).emit('player:kicked', { playerId: kickTargetId });
    if (kickedSocketIdEarly) {
      const kickedSocket = io.sockets.sockets.get(kickedSocketIdEarly) as AppSocket | undefined;
      if (kickedSocket) {
        kickedSocket.leave(roomCode);
        delete kickedSocket.data.roomCode;
        delete kickedSocket.data.playerId;
        delete kickedSocket.data.playerName;
      }
    }
  }

  broadcastRoomState(io, roomCode, roomManager);
}
