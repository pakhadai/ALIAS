import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Monorepo env loading:
// - root `.env` is convenient for local development (repo-wide vars)
// - `packages/server/.env` should override root for server-specific values
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const instanceFromEnv = process.env.INSTANCE_ID?.trim();

function parseCsvList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

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
  /**
   * Admin access email whitelist.
   *
   * - Comma-separated list of emails, e.g. `owner@example.com,admin@example.com`
   * - In production, if empty/unset, admin routes will be locked (misconfiguration).
   * - In development, if empty/unset, any authenticated (non-anonymous) user is allowed.
   */
  adminAllowedEmails: parseCsvList(process.env.ADMIN_ALLOWED_EMAILS).map((e) => e.toLowerCase()),
  /**
   * Static API key for admin access (alternative to JWT).
   * Used for manual admin login in AdminPanel.
   */
  adminApiKey: process.env.ADMIN_API_KEY || '',
  /**
   * Optional IP whitelist for admin routes (VPN / WireGuard).
   *
   * - Comma-separated IPs or CIDR ranges, e.g. `127.0.0.1,::1,10.8.0.0/24`
   * - When empty/unset, the check is disabled (so local dev doesn't break).
   *
   * WireGuard hint: if your WG interface is `wg0` with `10.8.0.1/24`, allow `10.8.0.0/24`.
   */
  adminAllowedIps: parseCsvList(process.env.ADMIN_ALLOWED_IPS),
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
