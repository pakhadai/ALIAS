import Redis from 'ioredis';
import type { GameSyncState } from '@alias/shared';

const ROOM_TTL = 7200; // 2 hours
const ROOM_PREFIX = 'alias:room:';
/** Last process that persisted room JSON — ops hint for multi-instance (sticky session debugging). */
const ROOM_WRITER_PREFIX = 'alias:room:writer:';
const SOCKET_KEY_PREFIX = 'alias:socket:';
/**
 * Separate prefix for the IMPOSTER secret word.
 * Intentionally NOT under `alias:room:` so the SCAN in getLiveStats never counts it.
 * The word is never included in GameSyncState (it's secret from all clients).
 */
const IMPOSTER_WORD_PREFIX = 'alias:imposter:';

export class RedisRoomStore {
  private redis: Redis | null = null;

  async connect(url: string): Promise<void> {
    try {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 200, 2000),
      });

      this.redis.on('error', (err) => {
        console.warn('[Redis] Connection error:', err.message);
      });

      await this.redis.ping();
      console.log('[Redis] Connected');
    } catch (err) {
      console.warn('[Redis] Not available, running without persistence');
      this.redis = null;
    }
  }

  get isConnected(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  /**
   * Persist snapshot + optional writer id (same TTL). Writer helps spot split-brain when LB
   * sends players to different Node processes for the same room.
   */
  async saveRoomState(
    roomCode: string,
    state: GameSyncState,
    writerInstanceId?: string
  ): Promise<void> {
    if (!this.redis) return;
    try {
      const pipe = this.redis.pipeline();
      pipe.set(`${ROOM_PREFIX}${roomCode}`, JSON.stringify(state), 'EX', ROOM_TTL);
      if (writerInstanceId) {
        pipe.set(`${ROOM_WRITER_PREFIX}${roomCode}`, writerInstanceId, 'EX', ROOM_TTL);
      }
      await pipe.exec();
    } catch {}
  }

  async getRoomState(roomCode: string): Promise<GameSyncState | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(`${ROOM_PREFIX}${roomCode}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /** Instance id that last persisted this room (see `saveRoomState` third arg). */
  async getRoomWriter(roomCode: string): Promise<string | null> {
    if (!this.redis) return null;
    try {
      return await this.redis.get(`${ROOM_WRITER_PREFIX}${roomCode}`);
    } catch {
      return null;
    }
  }

  async deleteRoom(roomCode: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(
        `${ROOM_PREFIX}${roomCode}`,
        `${ROOM_WRITER_PREFIX}${roomCode}`,
        `${IMPOSTER_WORD_PREFIX}${roomCode}`
      );
    } catch {}
  }

  /** Persist the IMPOSTER secret word (stored separately — never in GameSyncState). */
  async saveImposterWord(roomCode: string, word: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(`${IMPOSTER_WORD_PREFIX}${roomCode}`, word, 'EX', ROOM_TTL);
    } catch {}
  }

  /** Load the IMPOSTER secret word, or null if not found. */
  async getImposterWord(roomCode: string): Promise<string | null> {
    if (!this.redis) return null;
    try {
      return await this.redis.get(`${IMPOSTER_WORD_PREFIX}${roomCode}`);
    } catch {
      return null;
    }
  }

  /** Remove the IMPOSTER secret word (e.g. on game reset or room expiry). */
  async deleteImposterWord(roomCode: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(`${IMPOSTER_WORD_PREFIX}${roomCode}`);
    } catch {}
  }

  async roomExists(roomCode: string): Promise<boolean> {
    if (!this.redis) return false;
    try {
      return (await this.redis.exists(`${ROOM_PREFIX}${roomCode}`)) === 1;
    } catch {
      return false;
    }
  }

  // Track active socket -> room mapping for reconnection
  async setSocketRoom(socketId: string, roomCode: string, playerId: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(
        `${SOCKET_KEY_PREFIX}${socketId}`,
        JSON.stringify({ roomCode, playerId }),
        'EX',
        ROOM_TTL
      );
    } catch {}
  }

  async getSocketRoom(socketId: string): Promise<{ roomCode: string; playerId: string } | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(`${SOCKET_KEY_PREFIX}${socketId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async removeSocket(socketId: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(`${SOCKET_KEY_PREFIX}${socketId}`);
    } catch {}
  }

  /**
   * Admin metrics: SCAN room state keys (exclude writer markers) and socket binding keys.
   */
  async getLiveStats(): Promise<{
    activeRooms: number;
    playersOnline: number;
    redisConnected: boolean;
  }> {
    if (!this.redis || !this.isConnected) {
      return { activeRooms: 0, playersOnline: 0, redisConnected: false };
    }
    try {
      let activeRooms = 0;
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          `${ROOM_PREFIX}*`,
          'COUNT',
          200
        );
        cursor = next;
        for (const key of keys) {
          if (key.startsWith(ROOM_WRITER_PREFIX)) continue;
          activeRooms++;
        }
      } while (cursor !== '0');

      let playersOnline = 0;
      cursor = '0';
      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          `${SOCKET_KEY_PREFIX}*`,
          'COUNT',
          200
        );
        cursor = next;
        playersOnline += keys.length;
      } while (cursor !== '0');

      return { activeRooms, playersOnline, redisConnected: true };
    } catch {
      return { activeRooms: 0, playersOnline: 0, redisConnected: false };
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}
