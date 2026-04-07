import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@alias/shared';
import type { RoomManager } from '../services/RoomManager';
import type { GameEngine } from '../services/GameEngine';
import type { PerRoomQueue } from '../services/PerRoomQueue';
import type { RedisRoomStore } from '../services/RedisRoomStore';
import { newRelayRequestId, type RoomActionRelay } from '../services/RoomActionRelay';
import {
  roomCreateSchema,
  roomExistsSchema,
  roomJoinSchema,
  roomRejoinSchema,
  validatePayload,
  validateGameAction,
} from '../validation/schemas';
import { cancelGraceRemoval } from '../services/disconnectGrace';
import { roomError } from '../utils/roomError';
import { config } from '../config';
import { authorizeGameAction } from '../game/authorizeGameAction';
import { broadcastRoomState, executeGameActionPipeline } from '../game/gameActionPipeline';
import { onSocket } from '../utils/socketSentry';
type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export type SocketRelayDeps = {
  redisStore: RedisRoomStore;
  relay: RoomActionRelay;
};

async function getRoomWriterId(
  deps: SocketRelayDeps | null,
  roomCode: string
): Promise<string | null> {
  if (!deps?.redisStore.isConnected) return null;
  return deps.redisStore.getRoomWriter(roomCode);
}

export function registerSocketHandlers(
  io: IO,
  socket: AppSocket,
  roomManager: RoomManager,
  gameEngine: GameEngine,
  roomQueue: PerRoomQueue,
  relayDeps: SocketRelayDeps | null = null
): void {
  onSocket(socket, 'room:exists', async (...args) => {
    const rawData = args[0] as unknown;
    const ack =
      typeof args[1] === 'function' ? (args[1] as (res: { exists: boolean }) => void) : null;

    const data = validatePayload(roomExistsSchema, rawData);
    if (!data) {
      ack?.({ exists: false });
      return;
    }

    const writer = await getRoomWriterId(relayDeps, data.roomCode);
    if (writer) {
      ack?.({ exists: true });
      return;
    }

    await roomQueue.run(data.roomCode, async () => {
      let room = roomManager.getRoom(data.roomCode);
      if (!room) {
        room = (await roomManager.restoreRoomFromRedis(data.roomCode)) ?? undefined;
      }
      ack?.({ exists: Boolean(room) });
    });
  });

  onSocket(socket, 'room:create', async (rawData) => {
    // Захист від подвійного входу: якщо гравець вже в кімнаті, забороняємо створювати нову
    if (socket.data.roomCode) {
      socket.emit(
        'room:error',
        roomError('ALREADY_IN_ROOM', 'Спочатку вийдіть з поточної кімнати')
      );
      return;
    }

    const data = validatePayload(roomCreateSchema, rawData);
    if (!data) {
      socket.emit('room:error', roomError('INVALID_PAYLOAD', 'Invalid data'));
      return;
    }

    const room = await roomManager.createRoom(socket.id);
    const player = roomManager.addPlayer(
      room.code,
      socket.id,
      data.playerName,
      data.avatar,
      data.avatarId
    );
    if (!player) {
      roomManager.deleteRoom(room.code); // Clean up the zombie room
      socket.emit('room:error', roomError('ROOM_CREATE_FAILED', 'Failed to create room'));
      return;
    }

    player.isHost = true;
    room.hostUserId = socket.data.userId as string | undefined;
    void socket.join(room.code);
    socket.data.playerId = player.id;
    socket.data.playerName = data.playerName;
    socket.data.roomCode = room.code;

    socket.emit('room:created', { roomCode: room.code, playerId: player.id });
    broadcastRoomState(io, room.code, roomManager);
  });

  onSocket(socket, 'room:join', async (rawData) => {
    const data = validatePayload(roomJoinSchema, rawData);
    if (!data) {
      socket.emit('room:error', roomError('INVALID_PAYLOAD', 'Invalid data'));
      return;
    }

    // Захист від подвійного входу: якщо гравець вже в кімнаті, забороняємо приєднуватися до іншої
    if (socket.data.roomCode) {
      socket.emit(
        'room:error',
        roomError('ALREADY_IN_ROOM', 'Спочатку вийдіть з поточної кімнати')
      );
      return;
    }

    const selfId = config.serverInstanceId;
    const writer = await getRoomWriterId(relayDeps, data.roomCode);
    const useRelay =
      writer && writer !== selfId && config.roomActionRelayEnabled && relayDeps?.relay.isReady();

    if (useRelay && relayDeps) {
      const requestId = newRelayRequestId();
      relayDeps.relay.registerPending(requestId, socket);
      const published = await relayDeps.relay.publishRoomJoin(writer, {
        roomCode: data.roomCode,
        requestingSocketId: socket.id,
        playerName: data.playerName,
        avatar: data.avatar,
        avatarId: data.avatarId,
        replyToInstanceId: selfId,
        requestId,
      });
      if (!published) {
        relayDeps.relay.cancelPending(requestId);
        socket.emit(
          'room:error',
          roomError('RELAY_UNAVAILABLE', 'Could not reach the room host instance')
        );
      }
      return;
    }

    await roomQueue.run(data.roomCode, async () => {
      let room = roomManager.getRoom(data.roomCode);
      if (!room) {
        room = (await roomManager.restoreRoomFromRedis(data.roomCode)) ?? undefined;
      }
      if (!room) {
        socket.emit('room:error', roomError('ROOM_NOT_FOUND', `Room ${data.roomCode} not found`));
        return;
      }

      const player = roomManager.addPlayer(
        data.roomCode,
        socket.id,
        data.playerName,
        data.avatar,
        data.avatarId
      );
      if (!player) {
        socket.emit('room:error', roomError('ROOM_FULL', 'Room is full'));
        return;
      }

      void socket.join(data.roomCode);
      socket.data.playerId = player.id;
      socket.data.playerName = data.playerName;
      socket.data.roomCode = data.roomCode;

      socket.emit('room:joined', { roomCode: data.roomCode, playerId: player.id });
      io.to(data.roomCode).emit('room:player-joined', { player });
      broadcastRoomState(io, data.roomCode, roomManager);
    });
  });

  onSocket(socket, 'room:leave', async () => {
    const { roomCode } = socket.data;
    if (!roomCode) {
      socket.emit('room:error', roomError('PLAYER_NOT_IN_ROOM', 'Not in a room'));
      return;
    }

    // Clear socket data synchronously to prevent race conditions
    delete socket.data.roomCode;
    delete socket.data.playerId;
    delete socket.data.playerName;

    const selfId = config.serverInstanceId;
    const writer = await getRoomWriterId(relayDeps, roomCode);
    const useRelay =
      writer && writer !== selfId && config.roomActionRelayEnabled && relayDeps?.relay.isReady();

    if (useRelay && relayDeps) {
      const requestId = newRelayRequestId();
      relayDeps.relay.registerPending(requestId, socket);
      const published = await relayDeps.relay.publishRoomLeave(writer, {
        roomCode,
        socketId: socket.id,
        replyToInstanceId: selfId,
        requestId,
      });
      if (!published) {
        relayDeps.relay.cancelPending(requestId);
        socket.emit(
          'room:error',
          roomError('RELAY_UNAVAILABLE', 'Could not reach the room host instance')
        );
      }
      return;
    }

    await roomQueue.run(roomCode, async () => {
      const removedId = roomManager.removePlayer(roomCode, socket.id);
      if (removedId) {
        cancelGraceRemoval(removedId);
      }
      void socket.leave(roomCode);
      if (removedId) {
        io.to(roomCode).emit('room:player-left', { playerId: removedId });
        broadcastRoomState(io, roomCode, roomManager);
      }
    });
  });

  onSocket(socket, 'room:rejoin', async (rawData) => {
    const data = validatePayload(roomRejoinSchema, rawData);
    if (!data) {
      socket.emit('room:error', roomError('INVALID_PAYLOAD', 'Invalid rejoin data'));
      return;
    }

    const selfId = config.serverInstanceId;
    const writer = await getRoomWriterId(relayDeps, data.roomCode);
    const useRelay =
      writer && writer !== selfId && config.roomActionRelayEnabled && relayDeps?.relay.isReady();

    if (useRelay && relayDeps) {
      const requestId = newRelayRequestId();
      relayDeps.relay.registerPending(requestId, socket);
      const published = await relayDeps.relay.publishRoomRejoin(writer, {
        roomCode: data.roomCode,
        playerId: data.playerId,
        requestingSocketId: socket.id,
        replyToInstanceId: selfId,
        requestId,
      });
      if (!published) {
        relayDeps.relay.cancelPending(requestId);
        socket.emit(
          'room:error',
          roomError('RELAY_UNAVAILABLE', 'Could not reach the room host instance')
        );
      }
      return;
    }

    await roomQueue.run(data.roomCode, async () => {
      let room = roomManager.getRoom(data.roomCode);
      if (!room) {
        room = (await roomManager.restoreRoomFromRedis(data.roomCode)) ?? undefined;
      }
      if (!room) {
        socket.emit('room:error', roomError('ROOM_NOT_FOUND', 'Room not found'));
        return;
      }

      cancelGraceRemoval(data.playerId);

      const applied = roomManager.applyRejoinSocket(data.roomCode, data.playerId, socket.id);
      if (!applied) {
        socket.emit('room:error', roomError('PLAYER_NOT_IN_ROOM', 'Player not found in room'));
        return;
      }

      void socket.join(data.roomCode);
      socket.data.playerId = data.playerId;
      socket.data.playerName = applied.playerName;
      socket.data.roomCode = data.roomCode;

      socket.emit('room:rejoined', { roomCode: data.roomCode, playerId: data.playerId });
      const live = roomManager.getRoom(data.roomCode);
      if (live) {
        io.to(data.roomCode).emit('game:state-sync', roomManager.getSyncState(live));
      }
    });
  });

  onSocket(socket, 'game:action', async (rawPayload) => {
    const { roomCode } = socket.data;
    if (!roomCode) {
      socket.emit('room:error', roomError('PLAYER_NOT_IN_ROOM', 'Join a room first'));
      return;
    }

    const payload = validateGameAction(rawPayload);
    if (!payload) {
      socket.emit('room:error', roomError('INVALID_ACTION', 'Invalid action'));
      return;
    }

    if (payload.action === 'ADD_OFFLINE_PLAYER' || payload.action === 'REMOVE_OFFLINE_PLAYER') {
      return;
    }

    await roomQueue.run(roomCode, async () => {
      let room = roomManager.getRoom(roomCode);
      if (!room) {
        room = (await roomManager.restoreRoomFromRedis(roomCode)) ?? undefined;
      }
      if (!room) {
        socket.emit('room:error', roomError('ROOM_NOT_FOUND', 'Room not found'));
        return;
      }

      const authLocal = authorizeGameAction(room, payload, { mode: 'socket', socketId: socket.id });
      if (!authLocal.ok) {
        socket.emit('room:error', authLocal.error);
        return;
      }

      let writer: string | null = null;
      if (relayDeps?.redisStore.isConnected) {
        writer = await relayDeps.redisStore.getRoomWriter(roomCode);
      }
      const selfId = config.serverInstanceId;

      if (writer && writer !== selfId && config.roomActionRelayEnabled) {
        if (!relayDeps?.relay.isReady()) {
          socket.emit(
            'room:error',
            roomError('RELAY_UNAVAILABLE', 'Cluster relay is offline; reconnect to continue')
          );
          return;
        }
        const requestId = newRelayRequestId();
        relayDeps.relay.registerPending(requestId, socket);
        const published = await relayDeps.relay.publishGameAction(writer, {
          roomCode,
          actorPlayerId: authLocal.actorPlayerId,
          payload,
          replyToInstanceId: selfId,
          requestId,
        });
        if (!published) {
          relayDeps.relay.cancelPending(requestId);
          socket.emit(
            'room:error',
            roomError('RELAY_UNAVAILABLE', 'Could not reach the room host instance')
          );
        }
        return;
      }

      await executeGameActionPipeline(
        io,
        roomManager,
        gameEngine,
        room,
        roomCode,
        payload,
        authLocal.actorPlayerId
      );
    });
  });
}
