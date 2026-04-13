import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { config } from '../config';

export type TokenPayload = {
  sub: string; // userId (UUID)
  type: 'anonymous' | 'google' | 'telegram';
  email?: string;
  isAdmin?: boolean;
};

const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const googleClient = new OAuth2Client(config.google.clientId);

export type TelegramInitDataUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
};

export type TelegramInitData = {
  query_id?: string;
  user?: TelegramInitDataUser;
  receiver?: TelegramInitDataUser;
  start_param?: string;
  auth_date?: number;
  hash: string;
};

export class AuthService {
  private secret = config.jwt.secret;

  /** Issue a JWT */
  createToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: TOKEN_EXPIRY_SECONDS });
  }

  /** Issue a JWT for an anonymous device-based identity (legacy compat) */
  createAnonymousToken(userId: string): string {
    return this.createToken({ sub: userId, type: 'anonymous' });
  }

  /** Verify and decode a JWT */
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch {
      return null;
    }
  }

  /** Verify a Google ID token, return { googleId, email, name } or null */
  async verifyGoogleToken(
    idToken: string
  ): Promise<{ googleId: string; email: string; name: string } | null> {
    if (!config.google.clientId) {
      console.error('[Auth] GOOGLE_CLIENT_ID is not set — set it in .env and restart the server');
      return null;
    }
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });
      const p = ticket.getPayload();
      if (!p?.sub || !p.email) return null;
      return { googleId: p.sub, email: p.email, name: p.name || p.email };
    } catch (err) {
      console.error('[Auth] Google token verification failed:', (err as Error).message);
      return null;
    }
  }

  /**
   * Validate Telegram Mini App `initData` payload (HMAC-SHA256).
   *
   * Reference: TELEGRAM_SKILL.md §8.4
   */
  validateTelegramInitData(
    initData: string,
    botToken: string,
    maxAgeSeconds?: number
  ): TelegramInitData {
    const raw = String(initData || '').trim();
    if (!raw) {
      console.error('[Auth][Telegram] initData missing/empty');
      throw new Error('initData is required');
    }
    const token = String(botToken || '').trim();
    if (!token) {
      console.error('[Auth][Telegram] botToken missing/empty');
      throw new Error('botToken is required');
    }

    const params = new URLSearchParams(raw);
    const receivedHash = params.get('hash') ?? '';
    if (!receivedHash) {
      console.error('[Auth][Telegram] missing hash');
      throw new Error('Hash is missing');
    }

    // Optional replay protection
    const authDateRaw = params.get('auth_date');
    if (authDateRaw) {
      const authDate = parseInt(authDateRaw, 10);
      if (Number.isFinite(authDate) && authDate > 0) {
        const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
        const maxAgeFromEnvRaw = process.env.TELEGRAM_INITDATA_MAX_AGE_SECONDS;
        const maxAgeFromEnv = maxAgeFromEnvRaw ? parseInt(String(maxAgeFromEnvRaw), 10) : NaN;
        const effectiveMaxAge =
          typeof maxAgeSeconds === 'number' && Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0
            ? maxAgeSeconds
            : Number.isFinite(maxAgeFromEnv) && maxAgeFromEnv > 0
              ? maxAgeFromEnv
              : 86400; // 24 hours default

        if (ageSeconds > effectiveMaxAge) {
          console.error('[Auth][Telegram] expired auth_date', {
            ageSeconds,
            maxAgeSeconds: effectiveMaxAge,
          });
          throw new Error('initData is too old');
        }
      }
    }

    params.delete('hash');

    const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(receivedHash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.error('[Auth][Telegram] invalid signature', {
        computedHashLen: a.length,
        receivedHashLen: b.length,
      });
      throw new Error('Invalid hash — data may be tampered');
    }

    const result: TelegramInitData = {
      hash: receivedHash,
    };

    for (const [k, v] of entries) {
      if (k === 'user' || k === 'receiver') {
        try {
          (result as Record<string, unknown>)[k] = JSON.parse(v) as TelegramInitDataUser;
        } catch {
          // ignore invalid JSON, treat as absent
        }
        continue;
      }
      if (k === 'auth_date') {
        const n = parseInt(v, 10);
        if (Number.isFinite(n)) result.auth_date = n;
        continue;
      }
      (result as Record<string, unknown>)[k] = v;
    }

    return result;
  }
}

/** Shared singleton — import this instead of `new AuthService()` in route files. */
export const authService = new AuthService();
