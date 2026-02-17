import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { registerSocketHandlers } from './handlers/socketHandlers';
import { RoomManager } from './services/RoomManager';
import { GameEngine } from './services/GameEngine';
import { WordService } from './services/WordService';
import { RedisRoomStore } from './services/RedisRoomStore';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { applyRateLimit } from './middleware/rateLimit';
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

const app = express();
app.use(cors({ origin: config.cors.origin }));

// Stripe webhook needs raw body BEFORE express.json()
app.use('/api/purchases/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// Services (initialized early so routes can use prisma)
const prisma = new PrismaClient();

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', createAuthRoutes(prisma));
app.use('/api/admin', createAdminRoutes(prisma));
app.use('/api/store', createStoreRoutes(prisma));
app.use('/api/purchases', createPurchaseRoutes(prisma));
app.use('/api/custom-decks', createCustomDeckRoutes(prisma));
app.use('/api/push', createPushRoutes(prisma));

const httpServer = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
  },
});

// Services
const wordService = new WordService();
const roomManager = new RoomManager();
const redisStore = new RedisRoomStore();
const gameEngine = new GameEngine(roomManager, wordService);

/** Pending disconnects: socketId → timeout handle (60s grace period) */
const pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>();
const RECONNECT_GRACE_MS = 60_000;

// Initialize Redis connection (room store + pub/sub adapter)
redisStore.connect(config.redis.url)
  .then(() => {
    roomManager.setRedisStore(redisStore);

    // Socket.io Redis Adapter — enables horizontal scaling across multiple Node instances
    try {
      const pubClient = new Redis(config.redis.url, { maxRetriesPerRequest: 3 });
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Redis] Socket.io adapter configured');
    } catch (err) {
      console.warn('[Redis] Adapter setup failed, running single-instance:', (err as Error).message);
    }
  })
  .catch(() => {
    console.warn('[Redis] Running without persistence');
  });

// Initialize Prisma connection
prisma.$connect()
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
  registerSocketHandlers(io, socket, roomManager, gameEngine);

  // Rejoin: player reconnects with stored roomCode + playerId
  socket.on('room:rejoin', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) {
      socket.emit('room:error', { message: 'Room not found' });
      return;
    }

    // Check if this playerId exists in the room
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit('room:error', { message: 'Player not found in room' });
      return;
    }

    // Cancel pending removal if any
    const existingTimeout = pendingDisconnects.get(playerId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      pendingDisconnects.delete(playerId);
    }

    // Re-map socketId → playerId
    // Remove old stale socket entries for this playerId
    for (const [sid, pid] of room.socketToPlayer) {
      if (pid === playerId) room.socketToPlayer.delete(sid);
    }
    room.socketToPlayer.set(socket.id, playerId);

    // Update hostSocketId if this player was the host
    if (room.hostPlayerId === playerId) {
      room.hostSocketId = socket.id;
    }

    socket.join(roomCode);
    socket.data.playerId = playerId;
    socket.data.playerName = player.name;
    socket.data.roomCode = roomCode;

    socket.emit('room:rejoined', { roomCode, playerId });
    io.to(roomCode).emit('game:state-sync', roomManager.getSyncState(room));
    console.log(`[Socket] Rejoined: ${socket.id} → room ${roomCode}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    const { roomCode, playerId } = socket.data;

    // Grace period: delay actual removal by 60s
    if (roomCode && playerId) {
      const timeout = setTimeout(() => {
        pendingDisconnects.delete(playerId);
        const migration = roomManager.handleDisconnect(socket.id);
        if (migration) {
          const room = roomManager.getRoom(migration.roomCode);
          if (room) {
            io.to(migration.roomCode).emit('game:state-sync', roomManager.getSyncState(room));
            io.to(migration.roomCode).emit('game:notification', {
              message: 'Host disconnected. New host assigned.',
              type: 'info',
            });
          }
        }
      }, RECONNECT_GRACE_MS);
      pendingDisconnects.set(playerId, timeout);
    } else {
      // No room data — remove immediately
      roomManager.handleDisconnect(socket.id);
    }
  });
});

httpServer.listen(config.port, () => {
  console.log(`[Server] Alias server running on port ${config.port}`);
  console.log(`[Server] Environment: ${config.nodeEnv}`);
  console.log(`[Server] Google OAuth: ${config.google.clientId ? 'configured ✓' : 'NOT SET ✗'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisStore.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});
