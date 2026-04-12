import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisRoomStore } from '../RedisRoomStore';

// ─── Redis mock ──────────────────────────────────────────────────────────────
// We mock ioredis so tests run without a real Redis server.
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
      // Minimal scan emulation for tests: single-pass over current in-memory keys.
      // Pattern is always a prefix match like `alias:room:*`.
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RedisRoomStore — imposterWord', () => {
  let redisStore: RedisRoomStore;

  beforeEach(async () => {
    (globalThis as unknown as { __redisMockStore?: Map<string, string> }).__redisMockStore?.clear();
    redisStore = new RedisRoomStore();
    await redisStore.connect('redis://mock');
  });

  it('saves and retrieves imposterWord', async () => {
    await redisStore.saveImposterWord('12345', 'Кішка');
    const word = await redisStore.getImposterWord('12345');
    expect(word).toBe('Кішка');
  });

  it('returns null for a room without a saved imposterWord', async () => {
    const word = await redisStore.getImposterWord('99999');
    expect(word).toBeNull();
  });

  it('deletes imposterWord independently of room state', async () => {
    await redisStore.saveImposterWord('12345', 'Собака');
    await redisStore.deleteImposterWord('12345');
    const word = await redisStore.getImposterWord('12345');
    expect(word).toBeNull();
  });

  it('deleteRoom removes imposterWord together with room keys', async () => {
    await redisStore.saveImposterWord('12345', 'Літак');
    await redisStore.deleteRoom('12345');
    const word = await redisStore.getImposterWord('12345');
    expect(word).toBeNull();
  });

  it('no-ops gracefully when Redis is not connected', async () => {
    const disconnectedStore = new RedisRoomStore();
    // Not connected — all operations should resolve without throwing
    await expect(disconnectedStore.saveImposterWord('12345', 'test')).resolves.toBeUndefined();
    await expect(disconnectedStore.getImposterWord('12345')).resolves.toBeNull();
    await expect(disconnectedStore.deleteImposterWord('12345')).resolves.toBeUndefined();
  });
});

describe('RedisRoomStore — room state + socket mapping + stats', () => {
  let redisStore: RedisRoomStore;

  beforeEach(async () => {
    (globalThis as unknown as { __redisMockStore?: Map<string, string> }).__redisMockStore?.clear();
    redisStore = new RedisRoomStore();
    await redisStore.connect('redis://mock');
  });

  it('persists and reads room state snapshot', async () => {
    // normalizeGameSyncState requires `settings` (and string gameState / roomCode) or getRoomState returns null.
    const state = { roomCode: '12345', gameState: 'LOBBY', settings: {} } as never;
    await redisStore.saveRoomState('12345', state);
    const loaded = await redisStore.getRoomState('12345');
    expect(loaded).toMatchObject({ roomCode: '12345', gameState: 'LOBBY', settings: {} });
  });

  it('persists and reads room writer id', async () => {
    const state = { roomCode: '12345', gameState: 'LOBBY', settings: {} } as never;
    await redisStore.saveRoomState('12345', state, 'inst-1');
    const writer = await redisStore.getRoomWriter('12345');
    expect(writer).toBe('inst-1');
  });

  it('tracks socket -> room mapping', async () => {
    await redisStore.setSocketRoom('s1', '12345', 'p1');
    expect(await redisStore.getSocketRoom('s1')).toEqual({ roomCode: '12345', playerId: 'p1' });
    await redisStore.removeSocket('s1');
    expect(await redisStore.getSocketRoom('s1')).toBeNull();
  });

  it('roomExists reflects persisted room state', async () => {
    expect(await redisStore.roomExists('12345')).toBe(false);
    await redisStore.saveRoomState('12345', { roomCode: '12345' } as never);
    expect(await redisStore.roomExists('12345')).toBe(true);
  });

  it('getLiveStats counts rooms and socket bindings (excludes writer markers)', async () => {
    await redisStore.saveRoomState('11111', { roomCode: '11111' } as never, 'writer-x');
    await redisStore.saveRoomState('22222', { roomCode: '22222' } as never);
    await redisStore.setSocketRoom('sock-1', '11111', 'p1');
    await redisStore.setSocketRoom('sock-2', '22222', 'p2');

    const stats = await redisStore.getLiveStats();
    expect(stats.redisConnected).toBe(true);
    expect(stats.activeRooms).toBe(2);
    expect(stats.playersOnline).toBe(2);
  });
});
