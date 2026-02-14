import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { registerSocketHandlers } from './handlers/socketHandlers';
import { RoomManager } from './services/RoomManager';
import { GameEngine } from './services/GameEngine';
import { WordService } from './services/WordService';
import { RedisRoomStore } from './services/RedisRoomStore';
import { socketAuthMiddleware } from './middleware/socketAuth';
import authRoutes from './routes/auth';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@alias/shared';

const app = express();
app.use(cors({ origin: config.cors.origin }));
app.use(express.json());

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);

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
const prisma = new PrismaClient();
const wordService = new WordService();
const roomManager = new RoomManager();
const redisStore = new RedisRoomStore();
const gameEngine = new GameEngine(roomManager, wordService);

// Initialize Redis connection
redisStore.connect(config.redis.url)
  .then(() => {
    roomManager.setRedisStore(redisStore);
  })
  .catch(() => {
    console.warn('[Redis] Running without persistence');
  });

// Initialize Prisma connection
prisma.$connect()
  .then(() => {
    console.log('[DB] PostgreSQL connected');
    wordService.setPrisma(prisma);
  })
  .catch((err: Error) => {
    console.warn('[DB] PostgreSQL not available, using fallback word list:', err.message);
  });

// Socket.io auth middleware
io.use(socketAuthMiddleware);

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  registerSocketHandlers(io, socket, roomManager, gameEngine);

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
  });
});

httpServer.listen(config.port, () => {
  console.log(`[Server] Alias server running on port ${config.port}`);
  console.log(`[Server] Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisStore.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});
