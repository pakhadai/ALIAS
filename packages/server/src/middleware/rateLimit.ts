import type { Socket } from 'socket.io';

interface RateLimitConfig {
  /** Max events allowed in the window */
  maxEvents: number;
  /** Time window in milliseconds */
  windowMs: number;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale buckets every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000);

function isRateLimited(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return false;
  }

  bucket.count++;
  return bucket.count > config.maxEvents;
}

// Rate limit configs per event type
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'game:action': { maxEvents: 15, windowMs: 1000 },      // 15/sec
  'room:create': { maxEvents: 3, windowMs: 60_000 },      // 3/min
  'room:join': { maxEvents: 5, windowMs: 60_000 },        // 5/min
};

/**
 * Socket.io middleware that rate-limits events per socket.
 * Wraps socket.onAny to check rate limits before events reach handlers.
 */
export function applyRateLimit(socket: Socket): void {
  socket.use((event, next) => {
    const eventName = event[0] as string;
    const config = RATE_LIMITS[eventName];
    if (!config) return next();

    const key = `${socket.id}:${eventName}`;
    if (isRateLimited(key, config)) {
      console.warn(`[RateLimit] ${socket.id} exceeded limit for ${eventName}`);
      return next(new Error('Rate limit exceeded'));
    }

    next();
  });
}
