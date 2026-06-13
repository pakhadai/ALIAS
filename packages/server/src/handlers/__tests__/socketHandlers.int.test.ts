import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, type Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { registerSocketHandlers, type SocketRelayDeps } from '../socketHandlers';
import { RoomManager } from '../../services/RoomManager';
import { GameEngine } from '../../services/GameEngine';
import { WordService } from '../../services/WordService';
import { PerRoomQueue } from '../../services/PerRoomQueue';
import { RedisRoomStore } from '../../services/RedisRoomStore';
import { RoomActionRelay } from '../../services/RoomActionRelay';
import { wireGraceAfterMarkDisconnected } from '../../socket/disconnectFlow';
import { socketAuthMiddleware } from '../../middleware/socketAuth';
import { authService } from '../../services/AuthService';

vi.mock('ioredis', () => {
  const store: Map<string, string> = ((
    globalThis as unknown as { __redisMockStore?: Map<string, string> }
  ).__redisMockStore ??= new Map<string, string>());

  class MockRedis {
    status = 'ready';
    on() {
      return this;
    }
    async ping() {
      return 'PONG';
    }
    async set(key: string, value: string, ..._rest: unknown[]) {
      store.set(key, value);
      return 'OK';
    }
    async get(key: string) {
      return store.get(key) ?? null;
    }
    async del(...keys: string[]) {
      keys.forEach((k) => store.delete(k));
      return keys.length;
    }
    async exists(key: string) {
      return store.has(key) ? 1 : 0;
    }
    async scan(
      cursor: string,
      _match: 'MATCH',
      pattern: string,
      _count: 'COUNT',
      _n: number
    ): Promise<[string, string[]]> {
      const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
      const keys = Array.from(store.keys()).filter((k) => k.startsWith(prefix));
      return [cursor === '0' ? '0' : '0', keys];
    }
    pipeline() {
      const ops: Array<() => void> = [];
      const pipe = {
        set: (key: string, value: string, ..._rest: unknown[]) => {
          ops.push(() => store.set(key, value));
          return pipe;
        },
        async exec() {
          ops.forEach((fn) => fn());
          return [];
        },
      };
      return pipe;
    }
    async quit() {}
  }

  return { default: MockRedis };
});
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  GameSyncState,
} from '@movli/shared';
import { GameState, MAX_PLAYERS } from '@movli/shared';

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
  timeoutMs = 15_000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, ((data: unknown) => {
      clearTimeout(t);
      resolve(data as T);
    }) as unknown as AppOnceListener);
  });
}

function waitForSyncMatching(
  socket: AppClientSocket,
  predicate: (sync: GameSyncState) => boolean,
  timeoutMs = 15_000
): Promise<GameSyncState> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error('Timeout waiting for matching game:state-sync')),
      timeoutMs
    );
    const handler = (sync: GameSyncState) => {
      if (predicate(sync)) {
        clearTimeout(t);
        socket.off('game:state-sync', handler);
        resolve(sync);
      }
    };
    socket.on('game:state-sync', handler);
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

function createMockRelayDeps(
  getWriterId: () => string | null,
  publishSucceeds = true
): SocketRelayDeps {
  const redisStore = {
    isConnected: true,
    getRoomWriter: vi.fn(async () => getWriterId()),
  } as unknown as RedisRoomStore;

  const relay = new RoomActionRelay();
  vi.spyOn(relay, 'isReady').mockReturnValue(true);
  vi.spyOn(relay, 'publishRoomJoin').mockResolvedValue(publishSucceeds);
  vi.spyOn(relay, 'publishRoomLeave').mockResolvedValue(publishSucceeds);
  vi.spyOn(relay, 'publishRoomRejoin').mockResolvedValue(publishSucceeds);
  vi.spyOn(relay, 'publishGameAction').mockResolvedValue(publishSucceeds);

  return { redisStore, relay };
}

function emitRoomExistsAck(
  socket: AppClientSocket,
  roomCode: string,
  timeoutMs = 15_000
): Promise<{ exists: boolean }> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Timeout waiting for room:exists ack')), timeoutMs);
    socket.emit('room:exists', { roomCode }, (res: { exists: boolean }) => {
      clearTimeout(t);
      resolve(res);
    });
  });
}

const RECONNECT_GRACE_MS = 5_000;

type TestIoOptions = {
  relayDeps?: SocketRelayDeps | null;
  useAuth?: boolean;
};

async function startTestIo(options: TestIoOptions = {}): Promise<{
  httpServer: HttpServer;
  io: AppServer;
  baseUrl: string;
  roomManager: RoomManager;
  roomQueue: PerRoomQueue;
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
  const relayDeps = options.relayDeps ?? null;

  if (options.useAuth) {
    io.use(socketAuthMiddleware);
  }

  io.on('connection', (socket) => {
    registerSocketHandlers(
      io as unknown as AppServer,
      socket as unknown as AppServerSocket,
      roomManager,
      engine,
      queue,
      relayDeps
    );

    socket.on('disconnect', () => {
      const { roomCode } = socket.data;
      if (!roomCode) return;
      void queue.run(roomCode, async () => {
        const graceInfo = roomManager.markSocketDisconnected(socket.id);
        if (!graceInfo) return;
        wireGraceAfterMarkDisconnected(io, roomManager, queue, graceInfo, RECONNECT_GRACE_MS);
      });
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const addr = httpServer.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return {
    httpServer,
    io,
    baseUrl: `http://127.0.0.1:${port}`,
    roomManager,
    roomQueue: queue,
  };
}

async function startTestIoWithRedis(): Promise<{
  httpServer: HttpServer;
  io: AppServer;
  baseUrl: string;
  roomManager: RoomManager;
  roomQueue: PerRoomQueue;
}> {
  (globalThis as unknown as { __redisMockStore?: Map<string, string> }).__redisMockStore?.clear();

  const redisStore = new RedisRoomStore();
  await redisStore.connect('redis://mock');

  const httpServer = createServer();
  const io: AppServer = new IOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, { cors: { origin: '*' } });
  const roomManager = new RoomManager();
  roomManager.setRedisStore(redisStore);
  const engine = new GameEngine(roomManager, new WordService());
  const queue = new PerRoomQueue();

  io.on('connection', (socket) => {
    registerSocketHandlers(
      io as unknown as AppServer,
      socket as unknown as AppServerSocket,
      roomManager,
      engine,
      queue,
      null
    );

    socket.on('disconnect', () => {
      const { roomCode } = socket.data;
      if (!roomCode) return;
      void queue.run(roomCode, async () => {
        const graceInfo = roomManager.markSocketDisconnected(socket.id);
        if (!graceInfo) return;
        wireGraceAfterMarkDisconnected(io, roomManager, queue, graceInfo, RECONNECT_GRACE_MS);
      });
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const addr = httpServer.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return {
    httpServer,
    io,
    baseUrl: `http://127.0.0.1:${port}`,
    roomManager,
    roomQueue: queue,
  };
}

async function createHostRoom(baseUrl: string, clients: AppClientSocket[]) {
  const host = createClient(baseUrl);
  clients.push(host);
  await waitForEvent(host, 'connect');

  const hostSyncAfterCreateP = waitForEvent<GameSyncState>(host, 'game:state-sync');
  host.emit('room:create', { playerName: 'Host', avatar: '🎮' });
  const created = await waitForEvent<{ roomCode: string; playerId: string }>(host, 'room:created');
  await hostSyncAfterCreateP;
  return { host, created };
}

async function joinGuest(
  baseUrl: string,
  clients: AppClientSocket[],
  roomCode: string,
  host: AppClientSocket,
  playerName = 'Guest',
  avatar = '🎲'
) {
  const guest = createClient(baseUrl);
  clients.push(guest);
  await waitForEvent(guest, 'connect');

  const hostSyncAfterJoinP = waitForEvent<GameSyncState>(host, 'game:state-sync');
  guest.emit('room:join', { roomCode, playerName, avatar });
  const joined = await waitForEvent<{ roomCode: string; playerId: string }>(guest, 'room:joined');
  await hostSyncAfterJoinP;
  return { guest, joined };
}

describe('Socket handlers (integration)', () => {
  let httpServer: HttpServer;
  let io: AppServer;
  let baseUrl: string;
  let roomManager: RoomManager;
  const clients: AppClientSocket[] = [];

  beforeEach(async () => {
    vi.useRealTimers();
    ({ httpServer, io, baseUrl, roomManager } = await startTestIo());
  });

  afterEach(async () => {
    clients.splice(0).forEach((c) => c.disconnect());
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('room:create -> room:created + state sync', async () => {
    const client = createClient(baseUrl);
    clients.push(client);
    await waitForEvent(client, 'connect');

    const syncP = waitForEvent<GameSyncState>(client, 'game:state-sync');
    client.emit('room:create', { playerName: 'Host', avatar: '🎮' });

    const created = await waitForEvent<{ roomCode: string; playerId: string }>(
      client,
      'room:created'
    );
    expect(created.roomCode).toMatch(/^\d{5}$/);
    expect(created.playerId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    const sync = await syncP;
    expect(sync.roomCode).toBe(created.roomCode);
    expect(sync.players?.length).toBe(1);
  }, 20_000);

  it('room:join + room:leave updates sync and emits player events', async () => {
    const host = createClient(baseUrl);
    const guest = createClient(baseUrl);
    clients.push(host, guest);
    await Promise.all([waitForEvent(host, 'connect'), waitForEvent(guest, 'connect')]);

    const hostSyncAfterCreateP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('room:create', { playerName: 'Host', avatar: '🎮' });
    const created = await waitForEvent<{ roomCode: string; playerId: string }>(
      host,
      'room:created'
    );
    await hostSyncAfterCreateP;

    const hostPlayerJoinedP = waitForEvent<unknown>(host, 'room:player-joined');
    const hostSyncAfterJoinP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    guest.emit('room:join', { roomCode: created.roomCode, playerName: 'Guest', avatar: '🎲' });
    const joined = await waitForEvent<{ roomCode: string; playerId: string }>(guest, 'room:joined');
    expect(joined.roomCode).toBe(created.roomCode);

    // host sees join + state sync with 2 players
    await hostPlayerJoinedP;
    const sync2 = await hostSyncAfterJoinP;
    expect(sync2.players?.length).toBe(2);

    const hostPlayerLeftP = waitForEvent<unknown>(host, 'room:player-left');
    const hostSyncAfterLeaveP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    guest.emit('room:leave');
    await hostPlayerLeftP;
    const syncAfterLeave = await hostSyncAfterLeaveP;
    expect(syncAfterLeave.players?.length).toBe(1);
  }, 20_000);

  it('room:rejoin restores socket mapping and receives state sync', async () => {
    const host = createClient(baseUrl);
    const guest = createClient(baseUrl);
    clients.push(host, guest);
    await Promise.all([waitForEvent(host, 'connect'), waitForEvent(guest, 'connect')]);

    const hostSyncAfterCreateP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('room:create', { playerName: 'Host', avatar: '🎮' });
    const created = await waitForEvent<{ roomCode: string; playerId: string }>(
      host,
      'room:created'
    );
    await hostSyncAfterCreateP;

    const hostSyncAfterJoinP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    guest.emit('room:join', { roomCode: created.roomCode, playerName: 'Guest', avatar: '🎲' });
    const joined = await waitForEvent<{ roomCode: string; playerId: string }>(guest, 'room:joined');
    await hostSyncAfterJoinP;

    // Simulate dropped socket -> new socket rejoin
    guest.disconnect();
    const guest2 = createClient(baseUrl);
    clients.push(guest2);
    await waitForEvent(guest2, 'connect');

    const syncP = waitForEvent<GameSyncState>(guest2, 'game:state-sync');
    guest2.emit('room:rejoin', { roomCode: created.roomCode, playerId: joined.playerId });
    const rejoined = await waitForEvent<{ roomCode: string; playerId: string }>(
      guest2,
      'room:rejoined'
    );
    expect(rejoined.roomCode).toBe(created.roomCode);
    expect(rejoined.playerId).toBe(joined.playerId);

    const sync = await syncP;
    expect(sync.roomCode).toBe(created.roomCode);
    expect(sync.players?.some((p) => p.id === joined.playerId)).toBe(true);
  }, 25_000);

  it('KICK_PLAYER detaches socket and kicked cannot act', async () => {
    const host = createClient(baseUrl);
    const guest = createClient(baseUrl);
    clients.push(host, guest);
    await Promise.all([waitForEvent(host, 'connect'), waitForEvent(guest, 'connect')]);

    const hostSyncAfterCreateP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('room:create', { playerName: 'Host', avatar: '🎮' });
    const created = await waitForEvent<{ roomCode: string; playerId: string }>(
      host,
      'room:created'
    );
    await hostSyncAfterCreateP;

    const hostSyncAfterJoinP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    guest.emit('room:join', { roomCode: created.roomCode, playerName: 'Guest', avatar: '🎲' });
    const joined = await waitForEvent<{ roomCode: string; playerId: string }>(guest, 'room:joined');
    await hostSyncAfterJoinP;

    host.emit('game:action', { action: 'KICK_PLAYER', data: joined.playerId });

    const kickedOnGuest = await waitForEvent<{ playerId: string }>(guest, 'player:kicked');
    expect(kickedOnGuest.playerId).toBe(joined.playerId);

    // Now guest should not be in a room -> actions rejected early
    guest.emit('game:action', { action: 'START_GAME' });
    const err = await waitForEvent<{ code?: string }>(guest, 'room:error');
    expect(err?.code).toBe('PLAYER_NOT_IN_ROOM');
  }, 25_000);

  it('room:exists ack reports existence without joining the room', async () => {
    const probe = createClient(baseUrl);
    clients.push(probe);
    await waitForEvent(probe, 'connect');

    const { host, created } = await createHostRoom(baseUrl, clients);

    const existsRes = await emitRoomExistsAck(probe, created.roomCode);
    expect(existsRes.exists).toBe(true);

    const missingRes = await emitRoomExistsAck(probe, '99999');
    expect(missingRes.exists).toBe(false);

    // probe client never joined — host room still has one player
    expect(host.connected).toBe(true);
  }, 20_000);

  it('room:exists returns false when only stale writer key exists in Redis', async () => {
    const redisClients: AppClientSocket[] = [];
    const { httpServer: redisHttp, io: redisIo, baseUrl: redisUrl } = await startTestIoWithRedis();

    try {
      const mockStore = (globalThis as unknown as { __redisMockStore?: Map<string, string> })
        .__redisMockStore;
      mockStore?.set('movli:room:writer:54321', 'stale-writer-instance');

      const probe = createClient(redisUrl);
      redisClients.push(probe);
      await waitForEvent(probe, 'connect');

      const existsRes = await emitRoomExistsAck(probe, '54321');
      expect(existsRes.exists).toBe(false);
    } finally {
      redisClients.forEach((c) => c.disconnect());
      await new Promise<void>((resolve) => redisIo.close(() => resolve()));
      await new Promise<void>((resolve) => redisHttp.close(() => resolve()));
    }
  }, 20_000);

  it('room:rejoin within grace period restores session before removal', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest, joined } = await joinGuest(baseUrl, clients, created.roomCode, host);

    guest.disconnect();
    await new Promise((r) => setTimeout(r, 50));

    const guest2 = createClient(baseUrl);
    clients.push(guest2);
    await waitForEvent(guest2, 'connect');

    const syncP = waitForEvent<GameSyncState>(guest2, 'game:state-sync');
    guest2.emit('room:rejoin', { roomCode: created.roomCode, playerId: joined.playerId });
    const rejoined = await waitForEvent<{ roomCode: string; playerId: string }>(
      guest2,
      'room:rejoined'
    );
    expect(rejoined.playerId).toBe(joined.playerId);

    const sync = await syncP;
    expect(sync.players?.some((p) => p.id === joined.playerId && p.isConnected !== false)).toBe(
      true
    );
  }, 25_000);

  it('game:action rejects START_GAME from non-host with NOT_HOST', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest } = await joinGuest(baseUrl, clients, created.roomCode, host);

    guest.emit('game:action', { action: 'START_GAME' });
    const err = await waitForEvent<{ code?: string }>(guest, 'room:error');
    expect(err?.code).toBe('NOT_HOST');
  }, 20_000);

  it('game:action rejects CORRECT from non-explainer with NOT_EXPLAINER', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest } = await joinGuest(baseUrl, clients, created.roomCode, host);

    const syncHostTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-0' } });
    await syncHostTeamP;

    const syncGuestTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    guest.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-1' } });
    await syncGuestTeamP;

    const syncAfterStartP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('game:action', { action: 'START_GAME' });
    await syncAfterStartP;

    const live = roomManager.getRoom(created.roomCode)!;
    const team = live.teams[live.currentTeamIndex];
    const explainerId =
      team?.players[Math.min(team.nextPlayerIndex, Math.max(team.players.length - 1, 0))]?.id;
    expect(explainerId).toBe(created.playerId);

    const roundSyncP = waitForSyncMatching(host, (s) => s.gameState === 'COUNTDOWN');
    host.emit('game:action', { action: 'START_ROUND' });
    const roundSync = await roundSyncP;
    expect(roundSync.currentRoundStats?.explainerId).toBe(created.playerId);

    guest.emit('game:action', { action: 'CORRECT' });
    const err = await waitForEvent<{ code?: string }>(guest, 'room:error');
    expect(err?.code).toBe('NOT_EXPLAINER');
  }, 30_000);

  it('game:action rejects START_GAME when lobby is not ready', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);

    host.emit('game:action', { action: 'START_GAME' });
    const err = await waitForEvent<{ code?: string }>(host, 'room:error');
    expect(err?.code).toBe('LOBBY_NOT_READY');
    expect(roomManager.getRoom(created.roomCode)?.gameState).toBe(GameState.LOBBY);
  }, 20_000);

  it('room:join rejects when game is not in LOBBY', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest } = await joinGuest(baseUrl, clients, created.roomCode, host);

    const syncHostTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-0' } });
    await syncHostTeamP;

    const syncGuestTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    guest.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-1' } });
    await syncGuestTeamP;

    const syncAfterStartP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('game:action', { action: 'START_GAME' });
    await syncAfterStartP;

    const lateJoiner = createClient(baseUrl);
    clients.push(lateJoiner);
    await waitForEvent(lateJoiner, 'connect');

    lateJoiner.emit('room:join', {
      roomCode: created.roomCode,
      playerName: 'Late',
      avatar: '🦊',
    });
    const err = await waitForEvent<{ code?: string }>(lateJoiner, 'room:error');
    expect(err?.code).toBe('GAME_ALREADY_STARTED');
  }, 30_000);

  it('game:action rejects TEAM_JOIN during PLAYING', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest } = await joinGuest(baseUrl, clients, created.roomCode, host);

    const syncHostTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-0' } });
    await syncHostTeamP;

    const syncGuestTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    guest.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-1' } });
    await syncGuestTeamP;

    const syncAfterStartP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('game:action', { action: 'START_GAME' });
    await syncAfterStartP;

    const roundSyncP = waitForSyncMatching(host, (s) => s.gameState === 'COUNTDOWN');
    host.emit('game:action', { action: 'START_ROUND' });
    await roundSyncP;

    const playingSyncP = waitForSyncMatching(host, (s) => s.gameState === 'PLAYING');
    host.emit('game:action', { action: 'START_PLAYING' });
    await playingSyncP;

    guest.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-0' } });
    const err = await waitForEvent<{ code?: string }>(guest, 'room:error');
    expect(err?.code).toBe('INVALID_STATE');
  }, 35_000);

  it('room:create sets hostUserId when socket is authenticated', async () => {
    clients.splice(0).forEach((c) => c.disconnect());
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));

    ({ httpServer, io, baseUrl, roomManager } = await startTestIo({ useAuth: true }));

    const userId = '00000000-0000-4000-8000-000000000001';
    const token = authService.createToken({ sub: userId, type: 'google' });
    const client = createClient(baseUrl, token);
    clients.push(client);
    await waitForEvent(client, 'connect');

    const syncP = waitForEvent<GameSyncState>(client, 'game:state-sync');
    client.emit('room:create', { playerName: 'AuthHost', avatar: '🎮' });
    const created = await waitForEvent<{ roomCode: string; playerId: string }>(
      client,
      'room:created'
    );
    await syncP;

    const live = roomManager.getRoom(created.roomCode);
    expect(live?.hostUserId).toBe(userId);
  }, 20_000);

  it('room:join rejects ROOM_FULL when MAX_PLAYERS reached', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);

    for (let i = 0; i < MAX_PLAYERS - 1; i++) {
      await joinGuest(baseUrl, clients, created.roomCode, host, `P${i}`, `🎲${i % 10}`);
    }

    const live = roomManager.getRoom(created.roomCode);
    expect(live?.players).toHaveLength(MAX_PLAYERS);

    const overflow = createClient(baseUrl);
    clients.push(overflow);
    await waitForEvent(overflow, 'connect');
    overflow.emit('room:join', {
      roomCode: created.roomCode,
      playerName: 'Overflow',
      avatar: '🚫',
    });
    const err = await waitForEvent<{ code?: string }>(overflow, 'room:error');
    expect(err?.code).toBe('ROOM_FULL');
  }, 60_000);

  it('room:join allows duplicate display names with distinct player ids', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);

    const hostSync1P = waitForEvent<GameSyncState>(host, 'game:state-sync');
    const guest1 = createClient(baseUrl);
    clients.push(guest1);
    await waitForEvent(guest1, 'connect');
    guest1.emit('room:join', { roomCode: created.roomCode, playerName: 'Twin', avatar: '🎲' });
    const joined1 = await waitForEvent<{ roomCode: string; playerId: string }>(
      guest1,
      'room:joined'
    );
    await hostSync1P;

    const hostSync2P = waitForEvent<GameSyncState>(host, 'game:state-sync');
    const guest2 = createClient(baseUrl);
    clients.push(guest2);
    await waitForEvent(guest2, 'connect');
    guest2.emit('room:join', { roomCode: created.roomCode, playerName: 'Twin', avatar: '🦊' });
    const joined2 = await waitForEvent<{ roomCode: string; playerId: string }>(
      guest2,
      'room:joined'
    );
    const sync2 = await hostSync2P;

    expect(joined1.playerId).not.toBe(joined2.playerId);
    const twins = sync2.players?.filter((p) => p.name === 'Twin');
    expect(twins).toHaveLength(2);
  }, 25_000);

  it('room:rejoin after grace expiry returns PLAYER_NOT_IN_ROOM', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest, joined } = await joinGuest(baseUrl, clients, created.roomCode, host);

    guest.disconnect();
    await new Promise((r) => setTimeout(r, RECONNECT_GRACE_MS + 250));

    const guest2 = createClient(baseUrl);
    clients.push(guest2);
    await waitForEvent(guest2, 'connect');
    guest2.emit('room:rejoin', { roomCode: created.roomCode, playerId: joined.playerId });
    const err = await waitForEvent<{ code?: string }>(guest2, 'room:error');
    expect(err?.code).toBe('PLAYER_NOT_IN_ROOM');
  }, 25_000);

  it('host disconnect migrates host to remaining connected player', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest, joined } = await joinGuest(baseUrl, clients, created.roomCode, host);

    const notifP = waitForEvent<{ message?: string }>(guest, 'game:notification');
    const syncP = waitForSyncMatching(
      guest,
      (s) => s.players?.some((p) => p.id === joined.playerId && p.isHost) === true
    );

    host.disconnect();

    const notif = await notifP;
    expect(notif.message).toMatch(/host/i);
    const sync = await syncP;
    expect(sync.players?.find((p) => p.id === joined.playerId)?.isHost).toBe(true);

    const live = roomManager.getRoom(created.roomCode);
    expect(live?.hostPlayerId).toBe(joined.playerId);
  }, 25_000);

  it('migrated host can run host-only actions without NOT_HOST', async () => {
    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest, joined } = await joinGuest(baseUrl, clients, created.roomCode, host);

    host.disconnect();
    await waitForSyncMatching(
      guest,
      (s) => s.players?.some((p) => p.id === joined.playerId && p.isHost) === true
    );

    const syncHostTeamP = waitForEvent<GameSyncState>(guest, 'game:state-sync');
    guest.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-0' } });
    await syncHostTeamP;

    const syncGuestTeamP = waitForEvent<GameSyncState>(guest, 'game:state-sync');
    guest.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-1' } });
    await syncGuestTeamP;

    guest.emit('game:action', { action: 'START_GAME' });
    const syncAfterStartP = waitForSyncMatching(
      guest,
      (s) => s.gameState === GameState.PRE_ROUND || s.gameState === GameState.TEAMS
    );
    const syncAfterStart = await syncAfterStartP;
    expect(syncAfterStart.gameState).not.toBe(GameState.LOBBY);
  }, 35_000);

  it('room:create rejects invalid payload with INVALID_PAYLOAD', async () => {
    const client = createClient(baseUrl);
    clients.push(client);
    await waitForEvent(client, 'connect');

    client.emit('room:create', { playerName: '', avatar: '🎮' });
    const err = await waitForEvent<{ code?: string }>(client, 'room:error');
    expect(err?.code).toBe('INVALID_PAYLOAD');
  }, 15_000);
});

describe('Socket handlers — relay (integration)', () => {
  let httpServer: HttpServer;
  let io: AppServer;
  let baseUrl: string;
  const clients: AppClientSocket[] = [];
  const remoteWriterId = 'remote-writer-instance';
  let writerIdForRelay: string | null = remoteWriterId;
  let relayRef: RoomActionRelay;

  async function bootRelayIo(publishSucceeds = true): Promise<void> {
    const relayDeps = createMockRelayDeps(() => writerIdForRelay, publishSucceeds);
    relayRef = relayDeps.relay;
    ({ httpServer, io, baseUrl } = await startTestIo({ relayDeps }));
  }

  beforeEach(async () => {
    vi.useRealTimers();
    writerIdForRelay = remoteWriterId;
  });

  afterEach(async () => {
    if (clients.length > 0) {
      clients.splice(0).forEach((c) => c.disconnect());
    }
    if (io) {
      await new Promise<void>((resolve) => io.close(() => resolve()));
    }
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    vi.restoreAllMocks();
  });

  it('room:join forwards to writer and emits RELAY_UNAVAILABLE when publish fails', async () => {
    await bootRelayIo(false);

    const client = createClient(baseUrl);
    clients.push(client);
    await waitForEvent(client, 'connect');

    client.emit('room:join', {
      roomCode: '12345',
      playerName: 'Guest',
      avatar: '🎲',
    });
    const err = await waitForEvent<{ code?: string }>(client, 'room:error');
    expect(err?.code).toBe('RELAY_UNAVAILABLE');
  }, 20_000);

  it('game:action relay timeout emits RELAY_TIMEOUT when writer does not reply', async () => {
    writerIdForRelay = null;
    await bootRelayIo();

    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest } = await joinGuest(baseUrl, clients, created.roomCode, host);

    const syncHostTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-0' } });
    await syncHostTeamP;

    const syncGuestTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    guest.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-1' } });
    await syncGuestTeamP;

    writerIdForRelay = remoteWriterId;

    const errP = waitForEvent<{ code?: string }>(host, 'room:error', 12_000);
    host.emit('game:action', { action: 'START_GAME' });
    const err = await errP;
    expect(err?.code).toBe('RELAY_TIMEOUT');
  }, 20_000);

  it('game:action emits RELAY_UNAVAILABLE when relay publish fails', async () => {
    writerIdForRelay = null;
    await bootRelayIo(false);

    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest } = await joinGuest(baseUrl, clients, created.roomCode, host);

    const syncHostTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-0' } });
    await syncHostTeamP;

    const syncGuestTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    guest.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-1' } });
    await syncGuestTeamP;

    writerIdForRelay = remoteWriterId;

    const errP = waitForEvent<{ code?: string }>(host, 'room:error');
    host.emit('game:action', { action: 'START_GAME' });
    const err = await errP;
    expect(err?.code).toBe('RELAY_UNAVAILABLE');
  }, 30_000);

  it('game:action emits RELAY_UNAVAILABLE when cluster relay is offline', async () => {
    writerIdForRelay = null;
    await bootRelayIo();

    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest } = await joinGuest(baseUrl, clients, created.roomCode, host);

    const syncHostTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    host.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-0' } });
    await syncHostTeamP;

    const syncGuestTeamP = waitForEvent<GameSyncState>(host, 'game:state-sync');
    guest.emit('game:action', { action: 'TEAM_JOIN', data: { teamId: 'team-1' } });
    await syncGuestTeamP;

    writerIdForRelay = remoteWriterId;
    vi.mocked(relayRef.isReady).mockReturnValue(false);

    const errP = waitForEvent<{ code?: string; message?: string }>(host, 'room:error');
    host.emit('game:action', { action: 'START_GAME' });
    const err = await errP;
    expect(err?.code).toBe('RELAY_UNAVAILABLE');
    expect(err?.message).toMatch(/offline/i);
  }, 25_000);

  it('room:rejoin forwards to writer and emits RELAY_UNAVAILABLE when publish fails', async () => {
    writerIdForRelay = null;
    await bootRelayIo(false);

    const { host, created } = await createHostRoom(baseUrl, clients);
    const { guest, joined } = await joinGuest(baseUrl, clients, created.roomCode, host);

    guest.disconnect();
    await new Promise((r) => setTimeout(r, 50));

    writerIdForRelay = remoteWriterId;

    const guest2 = createClient(baseUrl);
    clients.push(guest2);
    await waitForEvent(guest2, 'connect');

    const errP = waitForEvent<{ code?: string }>(guest2, 'room:error');
    guest2.emit('room:rejoin', { roomCode: created.roomCode, playerId: joined.playerId });
    const err = await errP;
    expect(err?.code).toBe('RELAY_UNAVAILABLE');
  }, 25_000);

  it('room:rejoin rejects invalid payload with INVALID_PAYLOAD', async () => {
    await bootRelayIo();

    const client = createClient(baseUrl);
    clients.push(client);
    await waitForEvent(client, 'connect');

    client.emit('room:rejoin', { roomCode: '12345', playerId: 'not-a-uuid' });
    const err = await waitForEvent<{ code?: string }>(client, 'room:error');
    expect(err?.code).toBe('INVALID_PAYLOAD');
  }, 15_000);
});
