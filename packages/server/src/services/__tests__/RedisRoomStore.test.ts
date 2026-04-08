import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisRoomStore } from '../RedisRoomStore';

// ─── Redis mock ──────────────────────────────────────────────────────────────
// We mock ioredis so tests run without a real Redis server.
vi.mock('ioredis', () => {
  const store = new Map<string, string>();

  class MockRedis {
    status = 'ready';
    on() {
      return this;
    }
    async ping() {
      return 'PONG';
    }
    async set(key: string, value: string) {
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
    pipeline() {
      const ops: Array<() => void> = [];
      const pipe = {
        set: (key: string, value: string) => {
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
