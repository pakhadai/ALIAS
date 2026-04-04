import Redis from 'ioredis';
import type { GameSyncState } from '@alias/shared';

const ROOM_TTL = 7200; // 2 hours
const ROOM_PREFIX = 'alias:room:';
/** Last process that persisted room JSON — ops hint for multi-instance (sticky session debugging). */
const ROOM_WRITER_PREFIX = 'alias:room:writer:';

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
      await this.redis.del(`${ROOM_PREFIX}${roomCode}`, `${ROOM_WRITER_PREFIX}${roomCode}`);
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
        `alias:socket:${socketId}`,
        JSON.stringify({ roomCode, playerId }),
        'EX',
        ROOM_TTL
      );
    } catch {}
  }

  async getSocketRoom(socketId: string): Promise<{ roomCode: string; playerId: string } | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(`alias:socket:${socketId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async removeSocket(socketId: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(`alias:socket:${socketId}`);
    } catch {}
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}
