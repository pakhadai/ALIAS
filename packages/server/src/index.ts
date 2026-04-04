import * as Sentry from '@sentry/node';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { registerSocketHandlers } from './handlers/socketHandlers';
import { cancelGraceRemoval } from './services/disconnectGrace';
import { RoomManager } from './services/RoomManager';
import { GameEngine } from './services/GameEngine';
import { WordService } from './services/WordService';
import { RedisRoomStore } from './services/RedisRoomStore';
import { RoomActionRelay } from './services/RoomActionRelay';
import type {
  GameActionRpcInbound,
  RoomJoinRpcInbound,
  RoomLeaveRpcInbound,
  RoomRejoinRpcInbound,
  RoomDisconnectRpcInbound,
  RpcMessage,
} from './services/RoomActionRelay';
import { PerRoomQueue } from './services/PerRoomQueue';
import { authorizeGameAction } from './game/authorizeGameAction';
import { executeGameActionPipeline, broadcastRoomState } from './game/gameActionPipeline';
import { wireGraceAfterMarkDisconnected } from './socket/disconnectFlow';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { applyRateLimit } from './middleware/rateLimit';
import { authLimiter, storeLimiter, pushLimiter } from './middleware/httpRateLimit';
import { createAuthRoutes } from './routes/auth';
import { createAdminRoutes } from './routes/admin';
import { createStoreRoutes } from './routes/store';
import { createPurchaseRoutes } from './routes/purchases';
import { createCustomDeckRoutes } from './routes/custom-decks';
import { createPushRoutes } from './routes/push';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@alias/shared';
import { roomError } from './utils/roomError';
import { initServerSentry, registerExpressSentryErrorHandler } from './sentry/bootstrap';

const app = express();
initServerSentry(app, config.nodeEnv);
// Behind reverse proxies (e.g. Nginx Proxy Manager) we rely on X-Forwarded-* headers
// for correct client IP handling (e.g. express-rate-limit).
app.set('trust proxy', config.trustProxyHops);
app.use(cors({ origin: config.cors.origin }));

// Stripe webhook needs raw body BEFORE express.json()
app.use('/api/purchases/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// Services (initialized early so routes can use prisma)
const prisma = new PrismaClient();
const redisStore = new RedisRoomStore();
const roomActionRelay = new RoomActionRelay();

// Routes
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    instanceId: config.serverInstanceId,
    redis: redisStore.isConnected,
  });
});
app.use('/api/auth', authLimiter, createAuthRoutes(prisma));
app.use('/api/admin', createAdminRoutes(prisma, redisStore));
app.use('/api/store', storeLimiter, createStoreRoutes(prisma));
app.use('/api/purchases', storeLimiter, createPurchaseRoutes(prisma));
app.use('/api/custom-decks', createCustomDeckRoutes(prisma));
app.use('/api/push', pushLimiter, createPushRoutes(prisma));

registerExpressSentryErrorHandler(app);

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
    },
  }
);

io.engine.on('connection_error', (err) => {
  if (Sentry.isInitialized()) {
    Sentry.captureException(err, { tags: { source: 'socket.io-engine' } });
  }
});

// Services
const wordService = new WordService();
const roomManager = new RoomManager();
const roomQueue = new PerRoomQueue();
const gameEngine = new GameEngine(roomManager, wordService);

// Timer sync: re-broadcast room state every 10 s during active PLAYING
// so client timers that drifted (browser tab throttle) get corrected.
gameEngine.setTimerBroadcast((room) => {
  void roomQueue.run(room.code, async () => {
    const live = roomManager.getRoom(room.code);
    if (!live) return;
    io.to(room.code).emit('game:state-sync', roomManager.getSyncState(live));
  });
});

// In-game notifications (e.g. deck reshuffled)
gameEngine.setNotificationBroadcast((room, message, type) => {
  io.to(room.code).emit('game:notification', { message, type });
});

const RECONNECT_GRACE_MS = 60_000;

function handleRelayMessage(msg: RpcMessage): void {
  if (msg.kind === 'reply') {
    roomActionRelay.dispatchReply(msg);
    return;
  }
  switch (msg.kind) {
    case 'gameAction':
      void handleInboundGameAction(msg);
      break;
    case 'roomJoin':
      void handleInboundRoomJoin(msg);
      break;
    case 'roomLeave':
      void handleInboundRoomLeave(msg);
      break;
    case 'roomRejoin':
      void handleInboundRoomRejoin(msg);
      break;
    case 'roomDisconnect':
      handleInboundRoomDisconnect(msg);
      break;
    default:
      break;
  }
}

async function handleInboundGameAction(msg: GameActionRpcInbound): Promise<void> {
  void roomQueue.run(msg.roomCode, async () => {
    let room = roomManager.getRoom(msg.roomCode);
    if (!room) {
      room = (await roomManager.restoreRoomFromRedis(msg.roomCode)) ?? undefined;
    }
    if (!room) {
      await roomActionRelay.publishReply(msg.replyToInstanceId, {
        v: 1,
        kind: 'reply',
        requestId: msg.requestId,
        error: roomError('ROOM_NOT_FOUND', 'Room not found on host'),
      });
      return;
    }

    const auth = authorizeGameAction(room, msg.payload, {
      mode: 'relay',
      playerId: msg.actorPlayerId,
    });
    if (!auth.ok) {
      await roomActionRelay.publishReply(msg.replyToInstanceId, {
        v: 1,
        kind: 'reply',
        requestId: msg.requestId,
        error: auth.error,
      });
      return;
    }

    try {
      await executeGameActionPipeline(
        io,
        roomManager,
        gameEngine,
        room,
        msg.roomCode,
        msg.payload,
        auth.actorPlayerId
      );
      await roomActionRelay.publishReply(msg.replyToInstanceId, {
        v: 1,
        kind: 'reply',
        requestId: msg.requestId,
      });
    } catch (err) {
      if (Sentry.isInitialized()) {
        Sentry.captureException(err, { tags: { source: 'relay-game-action' } });
      }
      console.warn('[Relay] execute failed:', (err as Error).message);
      await roomActionRelay.publishReply(msg.replyToInstanceId, {
        v: 1,
        kind: 'reply',
        requestId: msg.requestId,
        error: roomError('INVALID_ACTION', 'Action failed on host instance'),
      });
    }
  });
}

async function handleInboundRoomJoin(msg: RoomJoinRpcInbound): Promise<void> {
  void roomQueue.run(msg.roomCode, async () => {
    let room = roomManager.getRoom(msg.roomCode);
    if (!room) {
      room = (await roomManager.restoreRoomFromRedis(msg.roomCode)) ?? undefined;
    }
    if (!room) {
      await roomActionRelay.publishReply(msg.replyToInstanceId, {
        v: 1,
        kind: 'reply',
        requestId: msg.requestId,
        error: roomError('ROOM_NOT_FOUND', `Room ${msg.roomCode} not found`),
      });
      return;
    }

    const player = roomManager.addPlayer(
      msg.roomCode,
      msg.requestingSocketId,
      msg.playerName,
      msg.avatar,
      msg.avatarId
    );
    if (!player) {
      await roomActionRelay.publishReply(msg.replyToInstanceId, {
        v: 1,
        kind: 'reply',
        requestId: msg.requestId,
        error: roomError('ROOM_FULL', 'Room is full'),
      });
      return;
    }

    io.to(msg.roomCode).emit('room:player-joined', { player });
    broadcastRoomState(io, msg.roomCode, roomManager);
    await roomActionRelay.publishReply(msg.replyToInstanceId, {
      v: 1,
      kind: 'reply',
      requestId: msg.requestId,
      roomJoinOk: { roomCode: msg.roomCode, player },
    });
  });
}

async function handleInboundRoomLeave(msg: RoomLeaveRpcInbound): Promise<void> {
  void roomQueue.run(msg.roomCode, async () => {
    const removedId = roomManager.removePlayer(msg.roomCode, msg.socketId);
    if (!removedId) {
      await roomActionRelay.publishReply(msg.replyToInstanceId, {
        v: 1,
        kind: 'reply',
        requestId: msg.requestId,
        error: roomError('PLAYER_NOT_IN_ROOM', 'Not in room on host'),
      });
      return;
    }
    cancelGraceRemoval(removedId);
    io.to(msg.roomCode).emit('room:player-left', { playerId: removedId });
    broadcastRoomState(io, msg.roomCode, roomManager);
    await roomActionRelay.publishReply(msg.replyToInstanceId, {
      v: 1,
      kind: 'reply',
      requestId: msg.requestId,
      roomLeaveOk: { roomCode: msg.roomCode },
    });
  });
}

async function handleInboundRoomRejoin(msg: RoomRejoinRpcInbound): Promise<void> {
  void roomQueue.run(msg.roomCode, async () => {
    let room = roomManager.getRoom(msg.roomCode);
    if (!room) {
      room = (await roomManager.restoreRoomFromRedis(msg.roomCode)) ?? undefined;
    }
    if (!room) {
      await roomActionRelay.publishReply(msg.replyToInstanceId, {
        v: 1,
        kind: 'reply',
        requestId: msg.requestId,
        error: roomError('ROOM_NOT_FOUND', 'Room not found'),
      });
      return;
    }

    cancelGraceRemoval(msg.playerId);

    const applied = roomManager.applyRejoinSocket(
      msg.roomCode,
      msg.playerId,
      msg.requestingSocketId
    );
    if (!applied) {
      await roomActionRelay.publishReply(msg.replyToInstanceId, {
        v: 1,
        kind: 'reply',
        requestId: msg.requestId,
        error: roomError('PLAYER_NOT_IN_ROOM', 'Player not found in room'),
      });
      return;
    }

    const live = roomManager.getRoom(msg.roomCode);
    if (live) {
      io.to(msg.roomCode).emit('game:state-sync', roomManager.getSyncState(live));
    }
    await roomActionRelay.publishReply(msg.replyToInstanceId, {
      v: 1,
      kind: 'reply',
      requestId: msg.requestId,
      roomRejoinOk: {
        roomCode: msg.roomCode,
        playerId: msg.playerId,
        playerName: applied.playerName,
      },
    });
  });
}

function handleInboundRoomDisconnect(msg: RoomDisconnectRpcInbound): void {
  void roomQueue.run(msg.roomCode, async () => {
    const graceInfo = roomManager.markSocketDisconnected(msg.socketId);
    if (!graceInfo) return;
    wireGraceAfterMarkDisconnected(io, roomManager, roomQueue, graceInfo, RECONNECT_GRACE_MS);
  });
}

// Initialize Redis connection (room store + pub/sub adapter)
redisStore
  .connect(config.redis.url)
  .then(async () => {
    roomManager.setRedisStore(redisStore);

    try {
      await roomActionRelay.connect(config.redis.url, handleRelayMessage);
      console.log('[Redis] Room action relay subscribed');
    } catch (err) {
      console.warn('[Redis] Room action relay failed:', (err as Error).message);
    }

    // Redis adapter fans out Socket.io events across processes, but authoritative room state still
    // lives in this process's RoomManager memory. Use sticky sessions (same client → same instance)
    // or accept that only the instance that holds the room can serve its gameplay until you add
    // distributed room ownership.
    try {
      const pubClient = new Redis(config.redis.url, { maxRetriesPerRequest: 3 });
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Redis] Socket.io adapter configured');
    } catch (err) {
      console.warn(
        '[Redis] Adapter setup failed, running single-instance:',
        (err as Error).message
      );
    }
  })
  .catch(() => {
    console.warn('[Redis] Running without persistence');
  });

// Initialize Prisma connection
prisma
  .$connect()
  .then(() => {
    console.log('[DB] PostgreSQL connected');
    wordService.setPrisma(prisma);
    gameEngine.setPrisma(prisma);
  })
  .catch((err: Error) => {
    console.warn('[DB] PostgreSQL not available, using fallback word list:', err.message);
  });

// Socket.io auth middleware
io.use(socketAuthMiddleware);

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  applyRateLimit(socket);
  registerSocketHandlers(io, socket, roomManager, gameEngine, roomQueue, {
    redisStore,
    relay: roomActionRelay,
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    const { roomCode, playerId } = socket.data;
    const disconnectedSocketId = socket.id;

    if (roomCode && playerId) {
      void roomQueue.run(roomCode, async () => {
        const localRoom = roomManager.getRoom(roomCode);
        if (localRoom) {
          const graceInfo = roomManager.markSocketDisconnected(disconnectedSocketId);
          if (!graceInfo) return;
          wireGraceAfterMarkDisconnected(io, roomManager, roomQueue, graceInfo, RECONNECT_GRACE_MS);
          return;
        }

        if (config.roomActionRelayEnabled && roomActionRelay.isReady() && redisStore.isConnected) {
          const writer = await redisStore.getRoomWriter(roomCode);
          if (writer && writer !== config.serverInstanceId) {
            await roomActionRelay.publishRoomDisconnect(writer, {
              roomCode,
              socketId: disconnectedSocketId,
            });
          }
        }
      });
    } else {
      const result = roomManager.handleDisconnect(disconnectedSocketId);
      if (result) {
        void roomQueue.run(result.roomCode, async () => {
          const room = roomManager.getRoom(result.roomCode);
          if (room) {
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
          }
        });
      }
    }
  });
});

httpServer.listen(config.port, () => {
  console.log(`[Server] Alias server running on port ${config.port}`);
  console.log(`[Server] Instance: ${config.serverInstanceId}`);
  console.log(`[Server] Environment: ${config.nodeEnv}`);
  console.log(`[Server] Google OAuth: ${config.google.clientId ? 'configured ✓' : 'NOT SET ✗'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await roomActionRelay.disconnect();
  await redisStore.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});
