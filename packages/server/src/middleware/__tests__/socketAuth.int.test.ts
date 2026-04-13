import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, type Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { socketAuthMiddleware } from '../socketAuth';
import { registerSocketHandlers } from '../../handlers/socketHandlers';
import { RoomManager } from '../../services/RoomManager';
import { GameEngine } from '../../services/GameEngine';
import { WordService } from '../../services/WordService';
import { PerRoomQueue } from '../../services/PerRoomQueue';
import { authService } from '../../services/AuthService';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  GameSyncState,
} from '@alias/shared';

type AppServer = IOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type AppClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;
type AppServerSocket = import('socket.io').Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type AppOnceArgs = Parameters<AppClientSocket['once']>;
type AppOnceEvent = AppOnceArgs[0];
type AppOnceListener = AppOnceArgs[1];

function waitForEvent<T>(
  socket: AppClientSocket,
  event: AppOnceEvent,
  timeoutMs = 10_000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, ((data: unknown) => {
      clearTimeout(t);
      resolve(data as T);
    }) as unknown as AppOnceListener);
  });
}

function createClient(baseUrl: string, token?: string): AppClientSocket {
  return ioc(baseUrl, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    timeout: 10_000,
    auth: token ? { token } : {},
  }) as unknown as AppClientSocket;
}

async function startTestIo(): Promise<{
  httpServer: HttpServer;
  io: AppServer;
  baseUrl: string;
}> {
  const httpServer = createServer();
  const io: AppServer = new IOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, { cors: { origin: '*' } });
  const roomManager = new RoomManager();
  const engine = new GameEngine(roomManager, new WordService());
  const queue = new PerRoomQueue();

  io.use(socketAuthMiddleware);
  io.on('connection', (socket) => {
    registerSocketHandlers(
      io as unknown as AppServer,
      socket as unknown as AppServerSocket,
      roomManager,
      engine,
      queue,
      null
    );
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const addr = httpServer.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { httpServer, io, baseUrl: `http://127.0.0.1:${port}` };
}

describe('Socket auth middleware (integration)', () => {
  let httpServer: HttpServer;
  let io: AppServer;
  let baseUrl: string;
  const clients: AppClientSocket[] = [];

  beforeEach(async () => {
    vi.useRealTimers();
    ({ httpServer, io, baseUrl } = await startTestIo());
  });

  afterEach(async () => {
    clients.splice(0).forEach((c) => c.disconnect());
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('rejects invalid token at handshake', async () => {
    const client = createClient(baseUrl, 'not-a-jwt');
    clients.push(client);
    const err = await waitForEvent<Error>(client, 'connect_error');
    expect(err).toBeInstanceOf(Error);
    expect(String(err.message)).toMatch(/invalid|expired/i);
  });

  it('accepts valid token and allows room:create', async () => {
    const token = authService.createToken({
      sub: '00000000-0000-4000-8000-000000000000',
      type: 'google',
    });
    const client = createClient(baseUrl, token);
    clients.push(client);
    await waitForEvent(client, 'connect');

    const syncP = waitForEvent<GameSyncState>(client, 'game:state-sync');
    client.emit('room:create', { playerName: 'Host', avatar: '🎮' });
    const created = await waitForEvent<{ roomCode: string; playerId: string }>(
      client,
      'room:created'
    );
    expect(created.roomCode).toMatch(/^\d{5}$/);
    const sync = await syncP;
    expect(sync.roomCode).toBe(created.roomCode);
  });
});
