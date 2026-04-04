import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@alias/shared';
import type { RoomManager } from '../services/RoomManager';
import type { PerRoomQueue } from '../services/PerRoomQueue';
import { scheduleGraceRemoval } from '../services/disconnectGrace';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/** After `markSocketDisconnected`, broadcast sync and start grace removal timer (writer instance). */
export function wireGraceAfterMarkDisconnected(
  io: IO,
  roomManager: RoomManager,
  roomQueue: PerRoomQueue,
  graceInfo: { roomCode: string; playerId: string; wasHostMigration: boolean },
  reconnectGraceMs: number
): void {
  const roomAfter = roomManager.getRoom(graceInfo.roomCode);
  if (roomAfter) {
    io.to(graceInfo.roomCode).emit('game:state-sync', roomManager.getSyncState(roomAfter));
    if (graceInfo.wasHostMigration) {
      io.to(graceInfo.roomCode).emit('game:notification', {
        message: 'Host disconnected. New host assigned.',
        type: 'info',
      });
    }
  }
  scheduleGraceRemoval(graceInfo.playerId, reconnectGraceMs, () => {
    void roomQueue.run(graceInfo.roomCode, async () => {
      const result = roomManager.finalizeGraceRemoval(graceInfo.roomCode, graceInfo.playerId);
      if (!result) return;
      const room = roomManager.getRoom(result.roomCode);
      if (!room) return;
      if (result.removedPlayerId) {
        io.to(result.roomCode).emit('room:player-left', { playerId: result.removedPlayerId });
      }
      io.to(result.roomCode).emit('game:state-sync', roomManager.getSyncState(room));
      if (result.wasMigration) {
        io.to(result.roomCode).emit('game:notification', {
          message: 'Host disconnected. New host assigned.',
          type: 'info',
        });
      }
    });
  });
}
