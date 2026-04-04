import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const instanceFromEnv = process.env.INSTANCE_ID?.trim();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  /** Set INSTANCE_ID when running multiple nodes so /health and Redis room markers are meaningful. */
  serverInstanceId: instanceFromEnv || randomUUID(),
  /**
   * Cross-node `game:action` forwarding via Redis pub/sub. Set to 0/false to disable (local-only actions).
   */
  roomActionRelayEnabled: !['0', 'false', 'no'].includes(
    (process.env.ROOM_ACTION_RELAY ?? '').trim().toLowerCase()
  ),
  trustProxyHops: (() => {
    // For deployments behind a reverse proxy (e.g. Nginx Proxy Manager),
    // trust only a specific number of proxy hops (NOT `true`), otherwise IP-based
    // rate limiting can be bypassed via X-Forwarded-For.
    const raw = process.env.TRUST_PROXY_HOPS;
    if (raw == null) return process.env.NODE_ENV === 'production' ? 1 : 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })(),
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: '7d',
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
      .split(',')
      .map((o) => o.trim()),
  },
  adminApiKey: process.env.ADMIN_API_KEY || 'dev-admin-key',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:5173/?purchase=success',
    cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:5173/?purchase=cancelled',
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    email: process.env.VAPID_EMAIL || 'mailto:admin@aliasmaster.app',
  },
};
